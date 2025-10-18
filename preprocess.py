# --- IMPORTS AND DATA LOADING (Same as before) ---
import pandas as pd
import numpy as np
import ast
import pickle

print("Loading data...")
movies = pd.read_csv('../data/tmdb_5000_movies.csv')
credits = pd.read_csv('../data/tmdb_5000_credits.csv')
movies = movies.merge(credits, on='title')

# --- FEATURE SELECTION (Modified) ---
# Add 'release_date' to the columns we keep
movies = movies[['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew', 'vote_average', 'release_date']]
movies.dropna(inplace=True)

# --- HELPER FUNCTIONS (Same as before) ---
def convert(obj):
    # ... (no changes here)
    L = []
    for i in ast.literal_eval(obj):
        L.append(i['name'])
    return L

def convert3(obj):
    # ... (no changes here)
    L = []
    counter = 0
    for i in ast.literal_eval(obj):
        if counter != 3:
            L.append(i['name'])
            counter += 1
        else:
            break
    return L

def fetch_director(obj):
    # ... (no changes here)
    L = []
    for i in ast.literal_eval(obj):
        if i['job'] == 'Director':
            L.append(i['name'])
            break
    return L

# --- DATA TRANSFORMATION (Modified) ---
print("Transforming data...")
# ... (most of this section is the same)
movies['display_genres'] = movies['genres'].apply(convert)
movies['display_cast'] = movies['cast'].apply(convert3)
movies['display_crew'] = movies['crew'].apply(fetch_director)

# NEW: Extract the release year
movies['release_year'] = pd.to_datetime(movies['release_date']).dt.year

movies['genres'] = movies['genres'].apply(convert)
# ... (rest of data transformation is the same)
movies['keywords'] = movies['keywords'].apply(convert)
movies['cast'] = movies['cast'].apply(convert3)
movies['crew'] = movies['crew'].apply(fetch_director)
movies['genres'] = movies['genres'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['keywords'] = movies['keywords'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['cast'] = movies['cast'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['crew'] = movies['crew'].apply(lambda x: [i.replace(" ", "") for i in x])

movies['tags'] = movies['overview'].apply(lambda x: x.split()) + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']

# Create a new dataframe with all the columns we need, including 'release_year'
new_df = movies[['movie_id', 'title', 'tags', 'overview', 'display_genres', 'display_cast', 'display_crew', 'vote_average', 'release_year']]
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))
new_df['tags'] = new_df['tags'].apply(lambda x: x.lower())
print("Data transformation complete.")

# --- VECTORIZATION AND SIMILARITY (Same as before) ---
from sklearn.feature_extraction.text import CountVectorizer
# ... (no changes here)
from sklearn.metrics.pairwise import cosine_similarity

print("Calculating similarity...")
cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(new_df['tags']).toarray()
similarity = cosine_similarity(vectors)
print("Similarity calculation complete.")


# --- SAVING THE PROCESSED DATA (Same as before) ---
print("Saving processed data...")
pickle.dump(new_df.to_dict(orient='records'), open('movies_df.pkl', 'wb'))
pickle.dump(similarity, open('similarity.pkl', 'wb'))

print("Preprocessing finished successfully! You can now run the backend server.")