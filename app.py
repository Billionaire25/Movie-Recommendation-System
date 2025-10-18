from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import pickle
import pandas as pd
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(
    __name__,
    static_folder='../frontend',
    template_folder='../frontend',
    static_url_path=''
)
CORS(app)

# --- Load Data ---
try:
    # Ensure you have re-run preprocess.py to create this pickle file
    movies_list = pickle.load(open('movies_df.pkl', 'rb'))
    similarity = pickle.load(open('similarity.pkl', 'rb'))
    movies_df = pd.DataFrame(movies_list)
    print("Data loaded successfully.")
except FileNotFoundError:
    print("Error: Pickle files not found. Please run preprocess.py first.")
    exit()
    
@app.route('/')
def home():
    """Serves the index.html file from the templates folder."""
    return render_template('index.html')

@app.route('/api/key')
def get_api_key():
    api_key = os.environ.get('TMDB_API_KEY')
    return jsonify({'apiKey': api_key})

# --- API Endpoints ---

@app.route('/genres', methods=['GET'])
def get_genres():
    """Returns a list of all unique genres for the filter."""
    all_genres = set()
    for genres_list in movies_df['display_genres']:
        for genre in genres_list:
            all_genres.add(genre)
    return jsonify(sorted(list(all_genres)))

@app.route('/search', methods=['GET'])
def search_movies():
    """Returns movies matching search query and all active filters."""
    query = request.args.get('query', '').lower()
    genre = request.args.get('genre', '')
    year = request.args.get('year', default=None, type=int)
    rating = request.args.get('rating', default=None, type=float)

    # Start with the full dataframe
    results_df = movies_df

    # 1. Filter by search query in the title
    if query:
        results_df = results_df[results_df['title'].str.lower().str.contains(query)]

    # 2. Filter by selected genre
    if genre:
        results_df = results_df[results_df['display_genres'].apply(lambda genres: genre in genres)]
    
    # 3. Filter by selected release year
    if year:
        results_df = results_df[results_df['release_year'] == year]

    # 4. Filter by minimum rating
    if rating:
        results_df = results_df[results_df['vote_average'] >= rating]

    # Return the filtered results
    search_results = results_df[['movie_id', 'title']].to_dict(orient='records')
    return jsonify(search_results)

@app.route('/movie_details', methods=['GET'])
def movie_details():
    """Returns detailed information for a specific movie."""
    movie_title = request.args.get('title')
    if not movie_title:
        return jsonify({'error': 'Movie title not provided'}), 400

    movie_data = movies_df[movies_df['title'] == movie_title]
    if movie_data.empty:
        return jsonify({'error': 'Movie not found'}), 404
    
    details = movie_data.iloc[0].to_dict()
    # Ensure director is a string, not a list, for easy display
    details['display_crew'] = details['display_crew'][0] if details['display_crew'] else 'N/A'
    return jsonify(details)

@app.route('/recommend', methods=['GET'])
def recommend():
    """Recommends 7 movies based on the selected movie."""
    movie_title = request.args.get('movie', type=str)
    
    if not movie_title or movie_title not in movies_df['title'].values:
        return jsonify({'error': 'Movie not found or not provided'}), 404

    movie_index = movies_df[movies_df['title'] == movie_title].index[0]
    distances = similarity[movie_index]
    
    # Get top 7 similar movies
    movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:8]
    
    recommended_movies = []
    for i in movies_list:
        movie_id = movies_df.iloc[i[0]].movie_id
        recommended_movies.append({
            'title': movies_df.iloc[i[0]].title,
            'id': int(movie_id)
        })
        
    return jsonify(recommended_movies)

if __name__ == '__main__':
    app.run(debug=True)