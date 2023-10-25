// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "hardhat/console.sol";

contract AuctionContract {
    struct User {
        string name;
        string email;
        Item[] items;
    }

    struct Item {
       string name;
       string description;
       uint reservePrice;
       address addr;
       uint startsAt;
       uint expiresAt;
       uint discountPrice;
       uint discountInterval;
       address owner;
    }
    //status 0 - not started, 1 - secred bid open, 2- secret bid close and normal bid opens
    // 3 - bid close
    struct Auction {
        Item item;
        address owner;
        uint status;
        uint startPrice;
        mapping(address => uint) secretBids;
    }

    mapping(address => User) public users;
    address[] public userList;
    mapping(address => Auction) public auctionItems;
    address[] public allAuctionItems; 

    function upsertUser(string memory name, string memory email) public {
        User storage storedUser = users[msg.sender];
        storedUser.name = name;
        storedUser.email = email;
        userList.push(msg.sender);
    }

    function getUser(address adr) public view returns (User memory) {
        return users[adr];
    }

    function listItem(Item memory item, uint expireAfter) public {
        require(item.addr != address(0), "Invalid address");
        require(item.reservePrice != 0, "Invalid reserve price");
        // require(item.startsAt > block.timestamp, "Invalid start time");
        require(expireAfter > 0, "Invalid expire after");
        require(item.discountPrice > 0, "Invalid discount price");
        require(item.discountInterval > 0, "Invalid discount interval");
        Item storage storedItem = auctionItems[item.addr].item;
        require(storedItem.reservePrice == 0, "Item already Exist");
        item.startsAt = block.timestamp;
        item.expiresAt = block.timestamp + expireAfter;
        item.owner = msg.sender;
        auctionItems[item.addr].item = item;
        auctionItems[item.addr].owner = msg.sender;
        auctionItems[item.addr].status = 1;
        users[msg.sender].items.push(item);
        allAuctionItems.push(item.addr);
    }

    function updateBidStatus(address addr, uint status) public {
        Auction storage auction = auctionItems[addr];
        require(auction.status == status -1,"Invalid status");
        require(auction.owner == msg.sender,"You are not owner");
        auction.status = status;
    }

    function placeSecretBid(uint amount, address addr) public {
        Auction storage auction = auctionItems[addr];
        if(auction.item.expiresAt < block.timestamp) {
            auction.status = 2;
            auction.item.startsAt = block.timestamp;
            uint price = calculateStartPrice(addr);
            auction.startPrice = price;
            revert("Bid Expired");
        }
        //require(block.timestamp < auction.item.expiresAt,"Bid is Expired");
        require(amount > 0,"Amount should be greater than 0");
        require(auction.status == 1,"Invalid status");
        require(auction.owner != msg.sender,"Owner can't place bid");
        require(auction.secretBids[msg.sender]==0, "Already placed bid");
        auction.secretBids[msg.sender] = amount;
        closeSecretBid(addr);
    }

    function getItemsForSecretBids() public view returns (Item[] memory) {
        uint len = allAuctionItems.length;
        if(len > 10) len = 10;
        Item[] memory items = new Item[](len);
        uint index = 0;
        for (uint i = 0; i < allAuctionItems.length; i++) {
            Auction storage auction = auctionItems[allAuctionItems[i]];
            if(auction.status == 1 && auction.item.expiresAt > block.timestamp){
                items[index] = auction.item;
                index++;
            }
        }
        return items;
    }

    function getItemsForBids() public view returns (Item[] memory) {
        uint len = allAuctionItems.length;
        if(len > 50) len = 50;
        Item[] memory items = new Item[](len);
        uint index = 0;
        for (uint i = 0; i < allAuctionItems.length; i++) {
            Auction storage auction = auctionItems[allAuctionItems[i]];
            if(auction.status == 2){
                items[index] = auction.item;
                index++;
            }
        }
        return items;
    }

    function getPrice(address addr) public view returns (uint) {
        Auction storage auction = auctionItems[addr];
        uint timeElapsed = block.timestamp - auction.item.startsAt;
        uint timeUnits = uint(timeElapsed) / uint(auction.item.discountInterval);
        uint discount = auction.item.discountPrice * timeUnits;
        if(discount>auction.startPrice){
            return 0;
        }
        return auction.startPrice - discount;
    }

    function getData(address addr) public view returns (uint, uint, uint, uint) {
        Auction storage auction = auctionItems[addr];
        return (block.timestamp, auction.item.startsAt, auction.item.discountInterval, auction.item.discountPrice);
    }

    function buy(uint amt, address addr) external returns (string memory, bool) {
        Auction storage auction = auctionItems[addr];
        require(auction.status == 2,"Invalid status");
        require(auction.owner != msg.sender,"Owner can't place bid");
        uint price = getPrice(addr);
        require(amt >= price, "Amount is less than price");
        if(auction.item.reservePrice > price){
            auctionItems[addr].status = 3;
            return("Price is less than reserve price, bid closed", false);
            //revert("Price is less than reserve price, bid closed");
        }
        auctionItems[addr].item.owner = addr;
        auctionItems[addr].item.reservePrice = price;
        auctionItems[addr].owner = msg.sender;
        return ("Done", true);
    }

    function getAllItems() public view returns (Item[] memory) {
        uint len = allAuctionItems.length;
        if(len > 50) len = 50;
        Item[] memory items = new Item[](len);
        uint index = 0;
        for (uint i = 0; i < allAuctionItems.length; i++) {
            Auction storage auction = auctionItems[allAuctionItems[i]];
            if(auction.status == 3){
                items[index] = auction.item;
                index++;
            }
        }
        return items;
    }

    function closeSecretBid(address addr) internal {
        Auction storage auction = auctionItems[addr];
        if(auction.item.expiresAt < block.timestamp) {
            auctionItems[addr].status = 2;
            auctionItems[addr].item.startsAt = block.timestamp;
            uint price = calculateStartPrice(addr);
            auctionItems[addr].startPrice = price;
            return;
        }
        bool pendingBid;
        for (uint i = 0; i < userList.length; i++) {
            if(auction.secretBids[userList[i]]==0 && auction.owner != userList[i]){
                pendingBid = true;
            }
        }

        if(!pendingBid){
            auctionItems[addr].status = 2;
            auctionItems[addr].item.startsAt = block.timestamp;
            uint price = calculateStartPrice(addr);
            auctionItems[addr].startPrice = price;
        }
    }
    
    function calculateStartPrice(address addr) internal view returns (uint) {
        Auction storage auction = auctionItems[addr];
        uint startPrice = 0;
        for (uint i = 0; i < userList.length; i++) {
            if(auction.secretBids[userList[i]]> startPrice){
                startPrice = auction.secretBids[userList[i]];
            }
        }
        startPrice = startPrice + startPrice/2;

        if(startPrice < auction.item.reservePrice){
            startPrice = auction.item.reservePrice + auction.item.reservePrice/2;
        }
        return startPrice;
    }
}
