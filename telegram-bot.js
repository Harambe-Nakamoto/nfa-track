const ethers = require("ethers");
const TelegramBot = require("node-telegram-bot-api");
const utils = ethers.utils;
const CHAT_ID = "-405709389";
const TOKEN = "1744726436:AAGb8TU-VJOI4L90Kadx9_YO2xAzJDlkLtQ";

const nfa_address = "0x6eca7754007d22d3F557740d06FeD4A031BeFE1e";
const wbnb_address = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const provider = new ethers.providers.JsonRpcProvider(
  "https://bsc-dataseed.binance.org/"
);

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];
const wbnbTransferedAbi = [
  "event Transfer(address indexed src, address indexed dst, uint wad);",
];
const iface = new utils.Interface(abi);

const wbnbIface = new utils.Interface(wbnbTransferedAbi);

const startBot = async (sale) => {
  const bot = new TelegramBot(TOKEN);
  const greenHeart = "💚";

  const bigNumber = (num) => {
    return num / 1e18;
  };
  const message = `Ape: #${sale.tokenId} \n\nBought For: ${bigNumber(
    sale.value
  )} BNB \n\n${greenHeart.repeat(Math.round(bigNumber(sale.value) * 10, 1))}`;
  if (sale.value !== "0") {
    bot.sendMessage(CHAT_ID, message);
  }
};

const processEvent = async (event) => {
  const parsed = await parseEvent(event);
  startBot(parsed);
};

const fetchLogs = async (startBlock) => {
  const filter = {
    address: nfa_address,
    fromBlock: startBlock,
    toBlock: startBlock + 1000,
    topics: [
      // the name of the event, parnetheses containing the data type of each event, no spaces
      utils.id("Transfer(address,address,uint256)"),
    ],
  };
  const events = await provider.getLogs(filter);
  const promises = [];
  for (const event of events) {
    promises.push(processEvent(event));
  }
  return Promise.all(promises);
};

const parseZeroValue = async (event) => {
  let value = 0;
  const transactionReceipt = await provider.getTransactionReceipt(
    event.transactionHash
  );
  transactionReceipt.logs.map((log) => {
    if (log.address === wbnb_address) {
      value += parseInt(wbnbIface.parseLog(log).args[2]);
    }
  });
  return value.toString();
};

const parseEvent = async (event) => {
  const transaction = await provider.getTransaction(event.transactionHash);
  const parsed = iface.parseLog(event);
  const { from, to } = parsed.args;
  const tokenId = parsed.args[2].toNumber();
  const value = transaction.value.toString();
  const { transactionHash, blockNumber } = event;
  const transferEvent = {
    from,
    to,
    tokenId,
    value,
    transactionHash,
    blockNumber,
  };
  if (transferEvent.value === "0") {
    transferEvent.value = await parseZeroValue(event);
  }
  return transferEvent;
};

const listenToEvents = async () => {
  const filter = {
    address: nfa_address,
    topics: [
      // the name of the event, parnetheses containing the data type of each event, no spaces
      utils.id("Transfer(address,address,uint256)"),
    ],
  };
  provider.on(filter, async (event) => {
    await processEvent(event);
  });
};


listenToEvents();
