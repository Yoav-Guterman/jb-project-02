"use strict";

(async () => {
    const getSingleCoin = async coinId => getData(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const getData = url => fetch(url).then(response => response.json());

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

    const checkCoinInLocalStorage = coinId => {
        const coinJSON = localStorage.getItem(`${coinId}`)
        if (coinJSON) {
            const coinData = JSON.parse(coinJSON)
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
        localStorage.setItem(`${singleCoinData.id}`, JSON.stringify(item));
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
                }
            });
        });
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

    const moreThanFiveCoins = (SelectedCoinsArray, sixthCoinId) => {
        // Get the modal and its elements
        const modalElement = document.getElementById("replaceCoinModal");
        const modal = new bootstrap.Modal(modalElement);
        const selectedCoinsList = document.getElementById("selectedCoinsList");
        selectedCoinsList.innerHTML = ""; // Clear previous content

        // Track if a replacement happens
        let replacementMade = false;

        // Populate the modal with the selected coins and replace buttons
        SelectedCoinsArray.forEach((coin, index) => {
            const listItem = document.createElement("li");
            listItem.className = "list-group-item d-flex justify-content-between align-items-center";
            listItem.innerHTML = `
                <span>${coin.name}</span>
                <button class="btn btn-danger btn-replace" data-index="${index}">Replace</button>
            `;
            selectedCoinsList.appendChild(listItem);
        });

        // Add event listeners to the "Replace" buttons
        document.querySelectorAll(".btn-replace").forEach(button => {
            button.addEventListener("click", async function () {
                const indexToReplace = parseInt(this.getAttribute("data-index"));

                try {
                    // Fetch the sixth coin data
                    const sixthCoinData = await getSingleCoin(sixthCoinId);

                    // Uncheck the replaced coin
                    const replacedCoinCheckbox = document.getElementById(`${SelectedCoinsArray[indexToReplace].id}Switch`);
                    if (replacedCoinCheckbox) {
                        replacedCoinCheckbox.checked = false;
                    }

                    // Replace the selected coin in the array
                    SelectedCoinsArray[indexToReplace] = sixthCoinData;

                    // Check the checkbox for the sixth coin
                    const sixthCoinCheckbox = document.getElementById(`${sixthCoinData.id}Switch`);
                    if (sixthCoinCheckbox) {
                        sixthCoinCheckbox.checked = true;
                    }

                    // Save the updated array to local storage
                    localStorage.setItem("selectedCoins", JSON.stringify(SelectedCoinsArray));

                    // Set replacement flag
                    replacementMade = true;

                    // Hide the modal
                    modal.hide();
                } catch (error) {
                    console.error("Error replacing the coin:", error);
                }
            });
        });

        // Handle cancel button click
        const cancelReplaceButton = document.getElementById("cancelReplace");
        cancelReplaceButton.addEventListener("click", () => {
            // Uncheck only the sixth coin
            const sixthCoinCheckbox = document.getElementById(`${sixthCoinId}Switch`);
            if (sixthCoinCheckbox) {
                sixthCoinCheckbox.checked = false;
            }
        });

        // Handle modal dismissal by clicking outside or pressing the X button
        modalElement.addEventListener("hidden.bs.modal", () => {
            // Only uncheck the sixth coin if no replacement was made
            if (!replacementMade) {
                const sixthCoinCheckbox = document.getElementById(`${sixthCoinId}Switch`);
                if (sixthCoinCheckbox) {
                    sixthCoinCheckbox.checked = false;
                }
            }
        });

        // Show the modal
        modal.show();
    };



    const initializeCheckbox = () => {
        // create all checkbox switches for all the coins
        document.querySelectorAll("#coins-container .form-check-input").forEach(button => {
            button.addEventListener("change", async function () {
                try {
                    const selectedCoinsJSON = localStorage.getItem('selectedCoins')
                    const coinId = this.id.replace('Switch', "")
                    // the id of the coin
                    let SelectedCoinsArray;
                    if (!selectedCoinsJSON) {
                        SelectedCoinsArray = []
                    } else {
                        SelectedCoinsArray = JSON.parse(selectedCoinsJSON)
                    }
                    if (this.checked === true) {
                        // if checkbox === true get the coin information and adds to the selected coins array on local storage
                        if (SelectedCoinsArray.length < 5) {
                            const singleCoinData = await getSingleCoin(coinId)
                            SelectedCoinsArray.push(singleCoinData)
                            localStorage.setItem('selectedCoins', JSON.stringify(SelectedCoinsArray))
                        } else {
                            moreThanFiveCoins(SelectedCoinsArray, coinId); // Pass the ID of the sixth coin
                        }
                    } else {
                        // else (switch to false) delete the specific coin from the selectedCoins array in the local storage
                        const newCoinArray = SelectedCoinsArray.filter(coin => coin.id !== coinId)
                        localStorage.setItem('selectedCoins', JSON.stringify(newCoinArray))
                    }
                } catch (e) {
                    console.warn(e)
                }
                // console.log(this.id)
                // console.log(this.checked)
                // const coinId = this.id.replace('Switch', "")
                // console.log(coinId)
            })
        })
    }

    const saveDisplayedCoinsToLocalStorage = displayedCoins => localStorage.setItem('displayedCoins', JSON.stringify(displayedCoins))


    const loadSelectedButtons = () => {
        const selectedCoinsJSON = localStorage.getItem('selectedCoins')
        let SelectedCoinsArray;
        if (!selectedCoinsJSON) {
            SelectedCoinsArray = []
        } else {
            SelectedCoinsArray = JSON.parse(selectedCoinsJSON)
        }
        SelectedCoinsArray.forEach(coin => {
            const checkbox = document.getElementById(`${coin.id + 'Switch'}`); // Get the checkbox element
            if (checkbox) {
                checkbox.checked = true; // Set the checkbox to checked
            }
            console.log(`${coin.id + 'Switch'}`); // Debugging log
        });
    }

    // MAIN FUNCTION
    const onload = async () => {
        try {
            // Fetch and filter coins data
            const allCoinsData = await getData("https://api.coingecko.com/api/v3/coins/list");
            const getFirst100CoinsData = allCoinsData.slice(0, 100);
            // save the displayed coin to local storage
            saveDisplayedCoinsToLocalStorage(getFirst100CoinsData)

            // Generate HTML for coins
            const coinsHTML = generateCoins(getFirst100CoinsData);

            // Render coins
            renderCoins(coinsHTML);

        } catch (e) {
            console.warn(e);
        }
    };

    document.getElementById('searchForm').addEventListener('submit', async (event) => {
        event.preventDefault()
        const coinSearch = document.getElementById('searchBar').value
        const allCoinsData = await getData("https://api.coingecko.com/api/v3/coins/list")
        const getFirstSearched100CoinsData = allCoinsData.filter(coin => coin.name.includes(coinSearch)).splice(0, 100)
        // save the displayed coin to local storage
        saveDisplayedCoinsToLocalStorage(getFirstSearched100CoinsData)
        const coinsSearchedHTML = generateCoins(getFirstSearched100CoinsData)

        renderCoins(coinsSearchedHTML);
    })

    onload();
})();
