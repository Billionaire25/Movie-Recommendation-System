document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchBar = document.getElementById('search-bar');
    const searchBtn = document.getElementById('search-btn');
    const filterContainer = document.getElementById('filter-container');
    const yearFilter = document.getElementById('year-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const movieGrid = document.getElementById('movie-grid');
    const resultsTitle = document.getElementById('results-title');
    const loader = document.getElementById('loader');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const movieModal = document.getElementById('movie-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const modalRecommendBtn = document.getElementById('modal-recommend-btn');

    // --- State ---
    let currentActiveGenre = '';

    // --- API Configuration ---
    let TMDB_API_KEY = ''; // IMPORTANT: Add your key here!
    const BACKEND_URL = '';

    async function getApiKeyAndInit() {
        try {
            const response = await fetch('/api/key');
            const data = await response.json();
            TMDB_API_KEY = data.apiKey;

            // Now that we have the key, run the initial setup
            setupGenreFilters();
            populateYearFilter();
            populateRatingFilter();
        } catch (error) {
            console.error('Failed to fetch API key:', error);
        }
    }

    // --- Core Functions ---

    // MODIFIED: This function is now more robust.
    async function searchMovies() {
        const query = searchBar.value.trim();
        const year = yearFilter.value;
        const rating = ratingFilter.value;

        loader.classList.remove('hidden');
        movieGrid.innerHTML = '';
        resultsTitle.textContent = 'Searching...';

        try {
            // Build the query string carefully, only adding parameters if they have a value.
            const params = new URLSearchParams();
            if (query) params.append('query', query);
            if (currentActiveGenre) params.append('genre', currentActiveGenre);
            if (year) params.append('year', year);
            if (rating) params.append('rating', rating);
            
            const response = await fetch(`${BACKEND_URL}/search?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const movies = await response.json();
            
            if (movies.length === 0) {
                resultsTitle.textContent = 'No movies found. Try loosening your filters!';
            } else {
                resultsTitle.textContent = 'Search Results';
                displayMovies(movies);
            }

        } catch (error) {
            console.error('Search failed:', error);
            resultsTitle.textContent = 'Error during search. Please try again.';
        } finally {
            loader.classList.add('hidden');
        }
    }

    async function getRecommendations(movieTitle) {
        loader.classList.remove('hidden');
        movieGrid.innerHTML = '';
        resultsTitle.textContent = `Because you like "${movieTitle}", you might also like...`;

        try {
            const response = await fetch(`${BACKEND_URL}/recommend?movie=${encodeURIComponent(movieTitle)}`);
            const movies = await response.json();
            displayMovies(movies);
        } catch (error) {
            console.error('Failed to get recommendations:', error);
            resultsTitle.textContent = 'Could not fetch recommendations.';
        } finally {
            loader.classList.add('hidden');
        }
    }

    // --- UI and Display Functions ---
    
    async function displayMovies(movies) {
        const moviePromises = movies.map(movie => fetchMoviePoster(movie.id || movie.movie_id, movie.title));
        const moviesWithPosters = await Promise.all(moviePromises);

        movieGrid.innerHTML = '';
        moviesWithPosters.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.classList.add('movie-card');
            movieCard.dataset.title = movie.title;

            const posterUrl = movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : 'https://via.placeholder.com/500x750.png?text=No+Poster';

            movieCard.innerHTML = `<img src="${posterUrl}" alt="${movie.title}"><h3>${movie.title}</h3>`;
            movieGrid.appendChild(movieCard);
        });
    }

    async function fetchMoviePoster(movieId, movieTitle) {
        // This function fetches poster from the external TMDB API
        if (!movieId) return { title: movieTitle, poster_path: null };
        try {
            const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`);
            const data = await response.json();
            return { title: movieTitle, poster_path: data.poster_path };
        } catch (error) {
            console.error('Could not fetch poster:', error);
            return { title: movieTitle, poster_path: null };
        }
    }

    async function showModal(movieTitle) {
        try {
            const response = await fetch(`${BACKEND_URL}/movie_details?title=${encodeURIComponent(movieTitle)}`);
            const details = await response.json();

            document.getElementById('modal-title').textContent = details.title;
            document.getElementById('modal-rating').textContent = details.vote_average.toFixed(1);
            document.getElementById('modal-plot').textContent = details.overview;
            document.getElementById('modal-cast').textContent = details.display_cast.join(', ');
            document.getElementById('modal-director').textContent = details.display_crew;
            
            const posterData = await fetchMoviePoster(details.movie_id, details.title);
            document.getElementById('modal-poster').src = posterData.poster_path
                ? `https://image.tmdb.org/t/p/w500${posterData.poster_path}`
                : 'https://via.placeholder.com/500x750.png?text=No+Poster';
            
            movieModal.dataset.currentMovie = details.title;
            modalOverlay.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to fetch movie details:', error);
        }
    }
    
    // --- Initial Setup Functions ---
    
    function populateYearFilter() {
        const currentYear = 2017;
        for (let year = currentYear; year >= 1980; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
    }

    function populateRatingFilter() {
        for (let i = 8; i >= 5; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}+ Stars`;
            ratingFilter.appendChild(option);
        }
    }
    
    async function setupGenreFilters() {
        try {
            const response = await fetch(`${BACKEND_URL}/genres`);
            const genres = await response.json();
            
            const allBtn = document.createElement('button');
            allBtn.classList.add('filter-btn', 'active');
            allBtn.textContent = 'All';
            allBtn.addEventListener('click', () => handleGenreClick(''));
            filterContainer.appendChild(allBtn);

            genres.forEach(genre => {
                const btn = document.createElement('button');
                btn.classList.add('filter-btn');
                btn.textContent = genre;
                btn.addEventListener('click', () => handleGenreClick(genre));
                filterContainer.appendChild(btn);
            });
        } catch (error) {
            console.error('Failed to fetch genres:', error);
        }
    }

    function handleGenreClick(genre) {
        currentActiveGenre = genre;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === (genre || 'All'));
        });
        searchMovies();
    }

    // --- Event Listeners ---
    searchBtn.addEventListener('click', searchMovies);
    searchBar.addEventListener('keyup', (event) => { if (event.key === 'Enter') searchMovies(); });
    yearFilter.addEventListener('change', searchMovies);
    ratingFilter.addEventListener('change', searchMovies);
    movieGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.movie-card');
        if (card) showModal(card.dataset.title);
    });
    closeModalBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) modalOverlay.classList.add('hidden'); });
    modalRecommendBtn.addEventListener('click', () => {
        const movieTitle = movieModal.dataset.currentMovie;
        if (movieTitle) {
            modalOverlay.classList.add('hidden');
            getRecommendations(movieTitle);
        }
    });

    // --- Initial Load ---
    getApiKeyAndInit();
});