"use strict";

(async () => {

    // const fetchRetry = async (url) => {
    //     let isSuccess = false;
    //     do {
    //         try {
    //             const data = await getData(url)
    //             isSuccess = true
    //         } catch (e) {
    //             setTimeout(() => {
    //                 fetchRetry(url)
    //             }, 5000)               
    //         }
    //     } while (!isSuccess)
    // }

    const getSingleCoin = async coin => getData(`https://api.coingecko.com/api/v3/coins/${coin}`)

    const getData = url => fetch(url).then(response => response.json())

    const generateCoins = coins => {
        const generateCoins =
            coins
                .map(coin => `
                    <div class="card">
                        <div class="card-body card-flex">
                            <div class="card-title-container">
                                <h4 class="card-title">${coin.symbol}</h4>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault">
                                    <label class="form-check-label" for="flexSwitchCheckDefault"></label>
                                </div>
                            </div>
                            <p class="card-text">${coin.name}</p>
                            <button id="${coin.id}" class="btn btn-primary btn-more-info">more info</button>

                        </div>
                    </div>
                    `)
                .join('')
        return generateCoins
    }

    const generateMoreInfo = singleCoinData => {

        const coinPriceToUSD = singleCoinData.market_data.current_price.usd
        const coinPriceToEUR = singleCoinData.market_data.current_price.eur
        const coinPriceToILS = singleCoinData.market_data.current_price.ils
        const coinImage = singleCoinData.image.thumb
        console.log(coinPriceToUSD)
        console.log(coinPriceToEUR)
        console.log(coinPriceToILS)
        console.log(coinImage)
    }

    const renderCoins = coinsHTML => document.getElementById('coins-container').innerHTML = coinsHTML

    const generateButtonId = () => {
        document.querySelectorAll('#coins-container button').forEach(button => button.addEventListener('click', async function () {
            // get data
            const singleCoinData = await getSingleCoin(this.id)

            // generate html
            const moreInfo = generateMoreInfo(singleCoinData)

            // render html

            console.log(moreInfo)
            console.log(this.id)
        }))
    }

    // MAIN FUNCTION
    const onload = async () => {
        try {
            // get data (on coins)
            const getCoinsData = await getData('https://api.coingecko.com/api/v3/coins/list')
            const getFirst100CoinsData = getCoinsData.splice(0, 100)
            console.log(getFirst100CoinsData)

            // generate data 
            const coinsHTML = generateCoins(getFirst100CoinsData)

            // render data
            renderCoins(coinsHTML)

            // generate button id
            generateButtonId()

        } catch (e) {
            console.warn(e)
        }

    }

    onload()

    // const btcData = await getSingleCoin('bitcoin')
    // const graphData = await getGraphData(['BTC','ETH'])
    // console.log(btcData)
    // console.log(graphData)

})()