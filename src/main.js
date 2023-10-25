import { arbitrum, mainnet, sepolia } from '@wagmi/core/chains'
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { watchAccount, disconnect, getAccount, writeContract, readContract } from '@wagmi/core'
import auctionABI from '../abi/auction';

// 1. Get projectId
const projectId = import.meta.env.VITE_PROJECT_ID
const auctionContract = import.meta.env.VITE_AUCTION_CONTRACT;

let connectedAccount;
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

// 2. Create wagmiConfig
const chains = [mainnet, arbitrum, sepolia]
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: 'Dutch Auction',
    description: 'Dutch Auction',
    url: 'https://web3modal.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  }
})

// 3. Create modal
const modal = createWeb3Modal({ wagmiConfig, projectId, chains, themeMode: 'light' })

// 4. listening for account changes
watchAccount(account => {
  //address.value = account.address ?? ''
  connectedAccount = account.address
  if (account.isConnected) {
    loginSection.style.display = "none";
    header.style.display = "block";
    //btnEl.innerText = 'Log out'
  }
})

//Referencing elements from html
const menu = document.getElementById('menu');
const header = document.getElementById('header')
const loginSection = document.getElementById('loginSection');
const profileSection = document.getElementById('profileSection')
const disconnectButton = document.getElementById('disconnect')
const liListItem = document.getElementById('liListItem')
const liSecretBids = document.getElementById('liSecretBids')
const liBids = document.getElementById('liBids')
const listItem = document.getElementById('listItem')
const submit = document.getElementById('submit')
const submitList = document.getElementById('submitList')
const name = document.getElementById('name')
const email = document.getElementById('email')
const login = document.getElementById('login')
const itemName = document.getElementById('itemName')
const description = document.getElementById('description')
const reservePrice = document.getElementById('reservePrice')
const itemAddress = document.getElementById('itemAddress')
const discountPrice = document.getElementById('discountPrice')
const discountInterval = document.getElementById('discountInterval')
const secretItems = document.getElementById('secretItems');
const itemList = document.getElementById('itemList')
const bidList = document.getElementById('bidList')
const myPopup = document.getElementById('myPopup')
const close = document.getElementById('close')
const bidAddress = document.getElementById('bidAddress')
const bidAddress1 = document.getElementById('bidAddress1')
const listError = document.getElementById('listError')
const bidSubmit = document.getElementById('bidSubmit')
const amount = document.getElementById('amount');
const bidError = document.getElementById('bidError');
const bids = document.getElementById('bids')
const bidPopup = document.getElementById('bidPopup')
const close1 = document.getElementById('close1')
const bidError1 = document.getElementById('bidError1');
const bidSubmit1 = document.getElementById('bidSubmit1')
const amount1 = document.getElementById('amount1');

const auctionedItems = document.getElementById('auctionedItems');
const allItems = document.getElementById('allItems');
const allItemsSection = document.getElementById('allItemsSection');

//Function call check if account is connected otherwise open modal for connection
function connect() {
  if (getAccount().isConnected) {
    disconnect()
  } else {
    modal.open()
  }
}

function disconnectClick() {
  disconnect();
  loginSection.style.display = "block";
  header.style.display = "none";
  profileSection.style.display = "none";
  listItem.style.display = "none"
  secretItems.style.display = "none";
}

login.addEventListener('click', connect);

disconnectButton.addEventListener('click', disconnectClick);

liListItem.addEventListener('click', function () {
  listItem.style.display = "block"
  loginSection.style.display = "none";
  profileSection.style.display = "none";
  secretItems.style.display = "none";
})

close.addEventListener('click', function () {
  bidError.innerHTML = "";
  myPopup.classList.remove("show");
})

close1.addEventListener('click', function () {
  bidError1.innerHTML = "";
  bidPopup.classList.remove("show");
})
//header elements
itemList.addEventListener("click", function (e) {

  if (e.target && e.target.nodeName === 'LI') {
    bidError.innerHTML = "";
    myPopup.classList.add("show");
    bidAddress.value = e.target.attributes.value.value;
  }
})

bidList.addEventListener("click", function (e) {
  if (e.target && e.target.nodeName === 'LI') {
    bidError1.innerHTML = "";
    bidPopup.classList.add("show");
    bidAddress1.value = e.target.attributes.value.value;
  }
})

bidSubmit.addEventListener('click', async function () {
  try {
    bidError.innerHTML = "";
    let amt = amount.value;
    if (amt <= 0) {
      bidError.innerText = "Enter positive non-zero value"
      return;
    }
    const { hash } = await writeContract({
      address: auctionContract,
      abi: auctionABI,
      functionName: 'placeSecretBid',
      args: [amt, bidAddress.value],
    })
    console.log("hash")
    myPopup.classList.remove("show");
  } catch (error) {
    bidError.innerText = error.message;
    return
  }
})

bidSubmit1.addEventListener('click', async function () {
  try {
    bidError1.innerHTML = "";
    let amt = amount1.value;
    if (amt <= 0) {
      bidError1.innerText = "Enter positive non-zero value"
      return;
    }
    const { hash } = await writeContract({
      address: auctionContract,
      abi: auctionABI,
      functionName: 'buy',
      args: [amt, bidAddress1.value],
    })
    console.log("hash::", hash)
    myPopup.classList.remove("show");
  } catch (error) {
    bidError1.innerText = error.message;
    return
  }
})

menu.addEventListener("click", async function (e) {

  if (e.target && e.target.nodeName === 'LI' && e.target.id == "profile") {
    // toggle done class
    e.target.classList.toggle('show');
    profileSection.style.display = "block";
    listItem.style.display = "none"
    secretItems.style.display = "none";
    allItemsSection.style.display = "none";
    const data = await readContract({
      address: auctionContract,
      abi: auctionABI,
      functionName: 'getUser',
      args: [connectedAccount],
    })
    name.value = data.name;
    email.value = data.email;
  }
});

submit.addEventListener("click", async function (e) {
  const { hash } = await writeContract({
    address: auctionContract,
    abi: auctionABI,
    functionName: 'upsertUser',
    args: [name.value, email.value],
  })
})

liSecretBids.addEventListener("click", async function () {
  itemList.innerHTML = "";
  profileSection.style.display = "none";
  listItem.style.display = "none";
  secretItems.style.display = "block";
  bids.style.display = "none";
  allItemsSection.style.display = "none";
  const data = await readContract({
    address: auctionContract,
    abi: auctionABI,
    functionName: 'getItemsForSecretBids',
  })
  for (let i = 0; i < data.length; i++) {
    if (data[i]['name'] != 0) {
      var li = document.createElement('li');
      li.innerHTML = data[i]['name'] + "-" + data[i]['description'];
      li.setAttribute("value", data[i]['addr']);
      itemList.appendChild(li);
    }
  }
})

liBids.addEventListener("click", async function () {
  bidList.innerHTML = "";
  profileSection.style.display = "none";
  listItem.style.display = "none";
  secretItems.style.display = "none";
  bids.style.display = "block";
  allItemsSection.style.display = "none";
  const data = await readContract({
    address: auctionContract,
    abi: auctionABI,
    functionName: 'getItemsForBids',
  })
  for (let i = 0; i < data.length; i++) {
    if (data[i]['name'] != 0) {
      try {
        const price = await readContract({
          address: auctionContract,
          abi: auctionABI,
          functionName: 'getPrice',
          args: [data[i]['addr']]
        })

        if (price > 0) {
          var li = document.createElement('li');
          li.innerHTML = `Name : ${data[i]['name']} Price : ${price}`;
          li.setAttribute("value", data[i]['addr']);
          bidList.appendChild(li);
        }
      } catch (error) {
        console.log(error)
      }
    }
  }
})

auctionedItems.addEventListener("click", async function () {
  bidList.innerHTML = "";
  profileSection.style.display = "none";
  listItem.style.display = "none";
  secretItems.style.display = "none";
  bids.style.display = "none";
  allItemsSection.style.display = "block";
  const data = await readContract({
    address: auctionContract,
    abi: auctionABI,
    functionName: 'getAllItems',
  })
  console.log(data)
  for (let i = 0; i < data.length; i++) {
    if (data[i]['name'] != 0) {
      var li = document.createElement('li');
      li.innerHTML = `Name : ${data[i]['name']} Owner : ${data[i]['owner']}`;
      allItems.appendChild(li);
    }
  }
})

//List a new item for auction
submitList.addEventListener("click", async function () {
  listError.innerText = "";
  let item = {
    name: itemName.value,
    description: description.value,
    reservePrice: parseInt(reservePrice.value),
    addr: itemAddress.value,
    discountPrice: parseInt(discountPrice.value),
    discountInterval: parseInt(discountInterval.value),
    startsAt: 0,
    expiresAt: 0,
    owner: connectedAccount
  }
  if (item.name == "") listError.innerText = "Invalid name";
  if (item.description == "") listError.innerText = "Invalid description";
  if (item.addr == "") listError.innerText = "Invalid addr";
  if (item.reservePrice == 0) listError.innerText = "Invalid reserve price";
  if (item.discountPrice == 0) listError.innerText = "Invalid discount Price";
  if (item.discountInterval == 0) listError.innerText = "Invalid discount Interval";
  console.log(item)
  if (listError.innerText != "") return;
  const { hash } = await writeContract({
    address: auctionContract,
    abi: auctionABI,
    functionName: 'listItem',
    args: [item, 500],
  })
  console.log(hash)
})