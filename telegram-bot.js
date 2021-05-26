const ethers = require("ethers");
const TelegramBot = require("node-telegram-bot-api");
const utils = ethers.utils;
const CHAT_ID = "-405709389";
const TOKEN = "1744726436:AAGb8TU-VJOI4L90Kadx9_YO2xAzJDlkLtQ";

class NfaTracking {
  nfa_address = "0x6eca7754007d22d3F557740d06FeD4A031BeFE1e";
  wbnb_address = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  provider = new ethers.providers.JsonRpcProvider(
    "https://bsc-dataseed.binance.org/"
  );

  abi = [
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ];
  wbnbTransferedAbi = [
    "event Transfer(address indexed src, address indexed dst, uint wad);",
  ];
  iface = new utils.Interface(this.abi);

  wbnbIface = new utils.Interface(this.wbnbTransferedAbi);

  async startBot(sale) {
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
  }

  async processEvent(event) {
    const parsed = await this.parseEvent(event);
    this.startBot(parsed);
  }

  async fetchLogs(startBlock) {
    const filter = {
      address: this.nfa_address,
      fromBlock: startBlock,
      toBlock: startBlock + 1000,
      topics: [
        // the name of the event, parnetheses containing the data type of each event, no spaces
        utils.id("Transfer(address,address,uint256)"),
      ],
    };
    const events = await this.provider.getLogs(filter);
    const promises = [];
    for (const event of events) {
      promises.push(this.processEvent(event));
    }
    return Promise.all(promises);
  }

  async parseZeroValue(event) {
    let value = 0;
    const transactionReceipt = await this.provider.getTransactionReceipt(
      event.transactionHash
    );
    transactionReceipt.logs.map((log) => {
      if (log.address === this.wbnb_address) {
        value += parseInt(this.wbnbIface.parseLog(log).args[2]);
      }
    });
    return value.toString();
  }

  async parseEvent(event) {
    const transaction = await this.provider.getTransaction(
      event.transactionHash
    );
    const parsed = this.iface.parseLog(event);
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
      transferEvent.value = await this.parseZeroValue(event);
    }
    return transferEvent;
  }

  async listenToEvents() {
    const filter = {
      address: this.nfa_address,
      topics: [
        // the name of the event, parnetheses containing the data type of each event, no spaces
        utils.id("Transfer(address,address,uint256)"),
      ],
    };
    this.provider.on(filter, async (event) => {
      await this.processEvent(event);
    });
  }
}

const listen = new NfaTracking();
listen.listenToEvents();
