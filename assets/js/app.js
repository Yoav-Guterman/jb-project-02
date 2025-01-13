"use strict";

(async () => {

    // small useful utility functions
    const saveToLocalStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const getFromLocalStorage = key => JSON.parse(localStorage.getItem(key));

    const getSingleCoin = async coinId => getData(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const getData = url => fetch(url).then(response => response.json());

    // loader functions
    const showLoader = () => document.getElementById('loader').style.display = 'block';
    const hideLoader = () => document.getElementById('loader').style.display = 'none';

    // Store the sixth coin ID for modal interaction (needed global variables)
    let pendingCoinId = null;
    let pendingCoinSwitch = null;

    const checkCoinInLocalStorage = coinId => {
        const coinData = getFromLocalStorage(coinId);
        if (coinData) {
            if (new Date().getTime() < coinData.expiration) {
                // check if current time is smaller than expiration (means less than 2 minutes)
                return true
            }
            return false
        }
        return false
    }

    const saveCoinInfoToStorage = singleCoinData => {
        const expirationTime = new Date().getTime() + 120 * 1000; // Calculate expiration timestamp (120 seconds)
        const item = {
            value: singleCoinData, // The coin data
            expiration: expirationTime // Expiration timestamp
        };
        saveToLocalStorage(singleCoinData.id, item);
    }

    const initializePopovers = () => {
        document.querySelectorAll("#coins-container .btn-popover").forEach(button => {
            button.addEventListener("click", async function () {
                // Check if a popover instance already exists
                let popoverInstance = bootstrap.Popover.getInstance(this);

                if (popoverInstance) {
                    // If popover exists, dispose it
                    popoverInstance.dispose();
                } else {
                    showLoader();
                    try {
                        let popoverContent;
                        let coinData;

                        // Define createPopover function
                        const createPopover = (content, name) => {
                            popoverInstance = new bootstrap.Popover(this, {
                                content: content,
                                title: `${name} Details`,
                                html: true,
                                trigger: "manual",
                                placement: "bottom"
                            });
                            popoverInstance.show();
                        };

                        // Check if there is already saved coin in the local storage or coin updated more than 2 minutes ago
                        if (checkCoinInLocalStorage(this.id)) {
                            // if true, generate the popover from the already exist local storage (to not bother the server)
                            const coinJSON = localStorage.getItem(this.id);
                            coinData = JSON.parse(coinJSON).value;
                            popoverContent = generateMoreInfo(coinData);
                            createPopover(popoverContent, coinData.name);
                        } else {
                            // if false, fetch from the server and saves in local storage
                            coinData = await getSingleCoin(this.id);
                            popoverContent = generateMoreInfo(coinData);
                            saveCoinInfoToStorage(coinData);
                            createPopover(popoverContent, coinData.name);
                        }
                    } catch (error) {
                        console.error("Error creating popover:", error);
                        // Create error popover
                        const errorPopover = new bootstrap.Popover(this, {
                            content: "Error loading data",
                            title: "Error",
                            html: true,
                            trigger: "manual",
                            placement: "bottom"
                        });
                        errorPopover.show();
                    }
                    hideLoader();
                }
            });
        });
    };



    const initializeCheckbox = () => {
        // Create all checkbox switches for all the coins
        document.querySelectorAll("#coins-container .form-check-input").forEach(button => {
            button.addEventListener("change", function () {
                const selectedCoinsArray = getFromLocalStorage('selectedCoins') || [];
                const coinId = this.id.replace('Switch', ""); // The id of the coin

                if (this.checked === true) {
                    // If checkbox is checked, handle coin selection
                    if (selectedCoinsArray.length < 5) {
                        // If less than 5 coins, add normally
                        const allCoins = getFromLocalStorage('allCoins');
                        const singleCoinData = allCoins.find(coin => coinId === coin.id);
                        selectedCoinsArray.push(singleCoinData);
                        saveToLocalStorage('selectedCoins', selectedCoinsArray);
                    } else {
                        // If trying to add a 6th coin, show modal
                        moreThanFiveCoins(coinId, this);
                    }
                } else {
                    // If unchecking, remove coin from selection
                    const newCoinArray = selectedCoinsArray.filter(coin => coin.id !== coinId);
                    saveToLocalStorage('selectedCoins', newCoinArray);
                }
            });
        });
    };

    const loadSelectedButtons = () => {
        const selectedCoinsArray = getFromLocalStorage('selectedCoins') || [];
        selectedCoinsArray.forEach(coin => {
            const checkbox = document.getElementById(`${coin.id + 'Switch'}`); // Get the checkbox element
            if (checkbox) {
                checkbox.checked = true; // Set the checkbox to checked
            }
        });
    }

    const handleCoinReplacement = (coinToReplaceId) => {
        // Get current selected coins
        const selectedCoins = getFromLocalStorage('selectedCoins') || [];
        // Remove the coin to be replaced
        const updatedSelectedCoins = selectedCoins.filter(coin => coin.id !== coinToReplaceId);

        // Get the new coin's data and add it
        const allCoins = getFromLocalStorage('allCoins');
        const newCoinData = allCoins.find(coin => coin.id === pendingCoinId);
        updatedSelectedCoins.push(newCoinData);

        // Update localStorage
        saveToLocalStorage('selectedCoins', updatedSelectedCoins);

        // Update UI switches
        const replacedCoinSwitch = document.getElementById(`${coinToReplaceId}Switch`);
        if (replacedCoinSwitch) {
            replacedCoinSwitch.checked = false;
        }

        // Reset pending coin data
        pendingCoinId = null;
        pendingCoinSwitch = null;
    };

    // this function is async because of the bootstrap modal
    const moreThanFiveCoins = async (coinId, switchElement) => {
        pendingCoinId = coinId;
        pendingCoinSwitch = switchElement;

        try {
            // Get currently selected coins from localStorage
            const selectedCoins = getFromLocalStorage('selectedCoins') || [];

            // Get all coins from localStorage to find the sixth coin's symbol
            const allCoins = getFromLocalStorage('allCoins');
            const sixthCoin = allCoins.find(coin => coin.id === coinId);

            // Update modal title with sixth coin information
            const modalTitle = document.getElementById('replaceCoinModalLabel');
            modalTitle.textContent = `Replace a coin with ${sixthCoin.symbol.toUpperCase()}`;

            // Generate list items for the modal
            const selectedCoinsList = document.getElementById('selectedCoinsList');
            selectedCoinsList.innerHTML = selectedCoins.map(coin => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${coin.symbol.toUpperCase()}
                <button class="btn btn-danger replace-coin-btn" data-coin-id="${coin.id}">
                    Replace
                </button>
            </li>
            `).join('');

            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('replaceCoinModal'));
            modal.show();

            // Add event listeners for replace buttons
            document.querySelectorAll('.replace-coin-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const coinToReplaceId = this.getAttribute('data-coin-id');
                    handleCoinReplacement(coinToReplaceId);
                    modal.hide();
                });
            });

            // Handle modal close events
            const modalElement = document.getElementById('replaceCoinModal');
            modalElement.addEventListener('hidden.bs.modal', handleModalClose);

            // Handle cancel button
            document.getElementById('cancelReplace').addEventListener('click', handleModalClose);

        } catch (error) {
            console.error('Error in moreThanFiveCoins:', error);
            pendingCoinSwitch.checked = false;
        }
    };


    const handleModalClose = () => {
        if (pendingCoinSwitch) {
            pendingCoinSwitch.checked = false;
        }
        pendingCoinId = null;
        pendingCoinSwitch = null;
    };

    const renderCoins = coinsHTML => {
        document.getElementById("coins-container").innerHTML = coinsHTML;
        // Initialize popovers for the buttons
        initializePopovers();
        // Initialize checkbox for the coins
        initializeCheckbox();
        // load the already selected buttons
        loadSelectedButtons()
    };

    const generateMoreInfo = singleCoinData => {
        const coinPriceToUSD = singleCoinData.market_data.current_price.usd;
        const coinPriceToEUR = singleCoinData.market_data.current_price.eur;
        const coinPriceToILS = singleCoinData.market_data.current_price.ils;
        const coinImage = singleCoinData.image.thumb;

        return `
            <div>
                <img src="${coinImage}" alt="${singleCoinData.name}" style="width: 50px; height: 50px;">
                <p>Price in USD: $${coinPriceToUSD}</p>
                <p>Price in EUR: €${coinPriceToEUR}</p>
                <p>Price in ILS: ₪${coinPriceToILS}</p>
            </div>
        `;
    };

    const generateCoins = coins => {
        return coins
            .map(
                coin => `
                    <div class="card">
                        <div class="card-body card-flex">
                            <div class="card-title-container">
                                <h4 class="card-title">${coin.symbol}</h4>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="${coin.id}Switch">
                                    <label class="form-check-label" for="flexSwitchCheckDefault"></label>
                                </div>
                            </div>
                            <p class="card-text">${coin.name}</p>
                            <button id="${coin.id}" type="button" class="btn btn-primary btn-popover">
                                More Info
                            </button>
                        </div>
                    </div>
                `
            )
            .join("");
    };

    // Update the search form event listener
    document.getElementById('searchForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const coinSearch = document.getElementById('searchBar').value.toLowerCase();

        const allCoinsData = getFromLocalStorage('allCoins');
        const getFirstSearched100CoinsData = allCoinsData
            .filter(coin =>
                coin.name.toLowerCase().includes(coinSearch) ||
                coin.symbol.toLowerCase().includes(coinSearch)
            )
            .slice(0, 100);

        saveToLocalStorage('displayedCoins', getFirstSearched100CoinsData);
        const coinsSearchedHTML = generateCoins(getFirstSearched100CoinsData);
        renderCoins(coinsSearchedHTML);
    });

    const showError = () => {
        document.getElementById('coins-container').innerHTML = `
            <div class="alert alert-danger text-center">
                Sorry, please try again later
                <br>
                <small>Attempting to reconnect...</small>
            </div>
        `;
    };

    // onLoad FUNCTION
    const onload = async () => {
        showLoader();
        try {
            // Fetch and store all coins on each load
            const allCoinsData = await getData("https://api.coingecko.com/api/v3/coins/list");
            const getFirst100CoinsData = allCoinsData.slice(0, 100);

            // Save both to localStorage using the new function
            saveToLocalStorage('allCoins', allCoinsData);
            saveToLocalStorage('displayedCoins', getFirst100CoinsData);
            const coinsHTML = generateCoins(getFirst100CoinsData);
            renderCoins(coinsHTML);
            // only hides on success
            hideLoader();
        } catch (e) {
            console.warn(e);
            showError();
            setTimeout(onload, 5000);
        }

    };

    onload();

    // the report tab
    let priceChart = null;
    let chartInterval = null;

    const createPriceChart = () => {
        const selectedCoins = getFromLocalStorage('selectedCoins') || [];
        const colors = ['red', 'blue', 'green', 'purple', 'orange'];

        const datasets = selectedCoins.map((coin, index) => ({
            label: coin.symbol.toUpperCase(),
            data: [],
            borderColor: colors[index],
            fill: false
        }));

        // activates charts.js to draw the graph
        const ctx = document.getElementById('priceChart').getContext('2d');

        // Destroy existing chart if exists to prevent duplicates
        if (priceChart) priceChart.destroy();

        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                animation: false
            }
        });
    };

    const updatePrices = async () => {
        const selectedCoins = getFromLocalStorage('selectedCoins') || [];
        if (selectedCoins.length === 0) return;

        const symbols = selectedCoins.map(coin => coin.symbol.toUpperCase()).join(',');
        try {
            const response = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbols}&tsyms=USD`);
            const prices = await response.json();

            // Add new timestamp
            priceChart.data.labels.push(new Date().toLocaleTimeString());

            // Add new prices
            priceChart.data.datasets.forEach(dataset => {
                const price = prices[dataset.label]?.USD || 0;
                dataset.data.push(price);
            });

            // Keep only last 10 points
            if (priceChart.data.labels.length > 10) {
                priceChart.data.labels.shift();
                priceChart.data.datasets.forEach(dataset => dataset.data.shift());
            }

            priceChart.update();
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    };

    // Initialize graph when Reports tab is clicked
    document.getElementById('reports-tab').addEventListener('click', () => {
        createPriceChart();
        // Clear existing interval if any
        if (chartInterval) clearInterval(chartInterval);
        // Start new update interval
        chartInterval = setInterval(updatePrices, 2000);
        // Initial price update
        updatePrices();
    });

    // Clean up when leaving Reports tab
    document.getElementById('reports-tab').addEventListener('hide.bs.tab', () => {
        if (chartInterval) {
            clearInterval(chartInterval);
            chartInterval = null;
        }
    });

    // the about pane
    document.getElementById('about-me').innerHTML = `
    My name is Yoav Guterman, and I am 22 years old from Herzliya.<br>
I finished my army service a few months ago, serving nearly four years in the military as a combat intelligence officer.<br>
After completing my service, I traveled the world for a few weeks. Following that,<br>
I began searching for something more meaningful and decided to learn coding.<br>
I enrolled in a course at John Bryce to help me enter the world of web development.<br><br>

This is my second project in the course.<br>
The project is about cryptocurrency coins. <br>
The cryptocurrency API includes over 16,000 coins and allows you to search for specific coins, <br>
view their prices in USD, EUR, and ILS, and see their images.<br><br>

You can also use the switchbox to navigate to the report pane,<br>
where you can view a real-time graph of the coin's performance.<br>
The graph supports up to five coins displayed simultaneously.<br>

I learned a lot while working on this project, although I found it challenging to manage over 400 lines of code.<br>
At times, I got lost in the code and had to pause to regain my bearings.<br>

I hope to continue learning more modern and efficient ways to handle projects like this in the future:)<br><br>
    
    this is me:<br>
    <img src="assets/pictures/me.jpg"></img>
    `
})();
