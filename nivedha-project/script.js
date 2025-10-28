const API_KEY = "c7e629c04eb645e7bea1edc0ee82885d"; // Replace with your NewsAPI key
const NEWS_API_BASE_URL = "https://newsapi.org/v2/";

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const categoriesContainer = document.querySelector(".categories");
const newsContainer = document.getElementById("news-container");
const loadingIndicator = document.getElementById("loading-indicator");

// Function to show/hide loading indicator
function showLoading() {
    loadingIndicator.classList.remove("hidden");
}

function hideLoading() {
    loadingIndicator.classList.add("hidden");
}

// Small HTML-escape helper to safely insert server messages into the page
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Development fallback so the UI remains useful when the API fails
const SAMPLE_ARTICLES = [
    {
        source: { name: "Local Sample" },
        author: "Dev",
        title: "Sample news item — local fallback",
        description: "This is a local fallback article shown when the NewsAPI request fails (useful for development).",
        url: "#",
        urlToImage: "https://via.placeholder.com/300x200?text=Sample+News",
        publishedAt: new Date().toISOString()
    }
];

// Function to fetch news from NewsAPI (improved error handling)
async function fetchNews(endpoint, params = {}) {
    showLoading();
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${NEWS_API_BASE_URL}${endpoint}?${queryString}&apiKey=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            // Attempt to read a JSON error message from the server
            let serverMessage = response.statusText || `Status ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson && errJson.message) serverMessage = errJson.message;
            } catch (e) {
                try {
                    const txt = await response.text();
                    if (txt) serverMessage = txt;
                } catch (ee) {
                    // ignore
                }
            }

            console.error(`NewsAPI error ${response.status}:`, serverMessage);

            // Specific guidance for 426 Upgrade Required
            if (response.status === 426) {
                newsContainer.innerHTML = `
                    <div class="api-error">
                        <p><strong>News API: Upgrade Required (426)</strong></p>
                        <p>This endpoint or action may require a paid plan or different API access. Check your API key and subscription on NewsAPI.org.</p>
                        <p>Server message: ${escapeHtml(serverMessage)}</p>
                    </div>`;
                return SAMPLE_ARTICLES;
            }

            // Generic non-ok
            newsContainer.innerHTML = `
                <div class="api-error">
                    <p><strong>Failed to load news (status ${response.status})</strong></p>
                    <p>${escapeHtml(serverMessage)}</p>
                </div>`;
            return [];
        }

        const data = await response.json();
        return data.articles || [];
    } catch (error) {
        console.error("Error fetching news:", error);
        newsContainer.innerHTML = `
            <div class="api-error">
                <p>Failed to load news. Please check your network connection and API key.</p>
                <p><em>${escapeHtml(error.message || error)}</em></p>
            </div>`;
        return SAMPLE_ARTICLES;
    } finally {
        hideLoading();
    }
}

// Function to render news cards
function renderNews(articles) {
    newsContainer.innerHTML = ""; // Clear previous news
    if (articles.length === 0) {
        newsContainer.innerHTML = `<p>No news found. Try a different search or category.</p>`;
        return;
    }

    articles.forEach(article => {
        const newsCard = document.createElement("div");
        newsCard.classList.add("news-card");

        const imageUrl = article.urlToImage || 'https://via.placeholder.com/300x200?text=News+Image&bg=1a1a1a&fg=ffffff';

        newsCard.innerHTML = `
            <img src="${imageUrl}" alt="${article.title}">
            <div class="news-card-content">
                <h2>${article.title}</h2>
                <p>${article.description || "No description available."}</p>
                <span class="source">Source: ${article.source.name || "Unknown"}</span>
                <a href="${article.url}" target="_blank" class="read-more">Read More</a>
            </div>
        `;
        newsContainer.appendChild(newsCard);
    });
}

// Event listener for search button
searchButton.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (query) {
        const articles = await fetchNews("everything", { q: query });
        renderNews(articles);
    }
});

// Event listener for category buttons
categoriesContainer.addEventListener("click", async (event) => {
    if (event.target.classList.contains("category-button")) {
        // Remove active class from all buttons
        document.querySelectorAll(".category-button").forEach(btn => btn.classList.remove("active"));
        // Add active class to the clicked button
        event.target.classList.add("active");

        const category = (event.target.dataset.category || '').toLowerCase();
        const articles = await fetchNews("top-headlines", { category: category, country: "us" });
        renderNews(articles);
    }
});

// Initial load: Fetch top headlines on page load
document.addEventListener("DOMContentLoaded", async () => {
    const articles = await fetchNews("top-headlines", { country: "us" });
    renderNews(articles);
});
