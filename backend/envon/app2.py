import os
import xgboost as xgb
import joblib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import numpy as np
import logging
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build", static_url_path="")
CORS(app)  # Enable CORS for all routes in development

# Configure logging to capture DEBUG level logs
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Determine the absolute path to the backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Absolute paths for model and scaler
# If environment variables are set, use them; otherwise, use default absolute paths
SCALER_PATH = os.getenv('SCALER_PATH', os.path.join(BASE_DIR, 'scaler.joblib'))
MODEL_PATH = os.getenv('MODEL_PATH', os.path.join(BASE_DIR, 'xgboost_model_latest.json'))

# Log the paths being used
logger.debug(f"Using Scaler Path: {SCALER_PATH}")
logger.debug(f"Using Model Path: {MODEL_PATH}")

# Load the scaler
try:
    scaler = joblib.load(SCALER_PATH)
    logger.info("Scaler loaded successfully.")
except Exception as e:
    logger.error(f"Error loading scaler: {e}")
    scaler = None

# Load the XGBoost model
try:
    model = xgb.Booster()
    model.load_model(MODEL_PATH)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    model = None

# Define the number of features your model expects
NUM_FEATURES = 9  # Ensure this matches your feature set

@app.route('/api/predict', methods=['POST'])
def predict():
    """Endpoint to predict human or bot activity."""
    try:
        # Check Content-Type
        if request.content_type != "application/json":
            logger.warning("Invalid Content-Type received.")
            return jsonify({'error': "Content-Type must be 'application/json'"}), 400

        # Parse input data
        data = request.get_json()
        if not data:
            logger.warning("No input data provided.")
            return jsonify({'error': 'No input data provided'}), 400

        logger.debug(f"Received data for prediction: {data}")

        # Extract features
        features = [
            data.get('avgCursorSpeed', 0),
            data.get('cursorAcceleration', 0),
            data.get('pathDeviation', 0),
            data.get('mean_click_interval', 0),
            data.get('std_click_interval', 0),
            data.get('mean_keystroke_duration', 0),
            data.get('std_keystroke_duration', 0),
            data.get('session_length', 0),
            data.get('average_speed', 0)
        ]

        logger.debug(f"Extracted features: {features}")

        # Validate feature count
        if len(features) != NUM_FEATURES:
            logger.error(f'Expected {NUM_FEATURES} features, got {len(features)}.')
            return jsonify({'error': f'Expected {NUM_FEATURES} features, got {len(features)}.'}), 400

        # Check for invalid feature types
        if any(not isinstance(feature, (int, float)) for feature in features):
            logger.error('Invalid feature types. Expected numerical values.')
            return jsonify({'error': 'Invalid feature types. Expected numerical values.'}), 400

        # Convert to numpy array and reshape for scaler
        features_array = np.array(features).reshape(1, -1)
        logger.debug(f"Features array before scaling: {features_array}")

        # Scale the features
        if scaler:
            scaled_features = scaler.transform(features_array)
            logger.debug(f"Scaled features: {scaled_features}")
        else:
            logger.error("Scaler is not loaded. Cannot proceed with prediction.")
            return jsonify({'error': 'Scaler not available. Contact the administrator.'}), 500

        # Create DMatrix for XGBoost
        dmatrix = xgb.DMatrix(scaled_features)

        # Predict
        if model:
            prediction_proba = model.predict(dmatrix)
            logger.debug(f"Prediction probability: {prediction_proba}")

            # Assuming binary classification with probability outputs
            prediction = int(prediction_proba > 0.5)  # 0 or 1
            logger.debug(f"Raw prediction value: {prediction_proba}, Classified as: {prediction}")
        else:
            logger.error("Model is not loaded. Cannot proceed with prediction.")
            return jsonify({'error': 'Model not available. Contact the administrator.'}), 500

        # Map prediction to a human-readable label
        label = 'human' if prediction == 0 else 'bot'
        logger.info(f"Prediction result: {label} with probability {float(prediction_proba)}")

        return jsonify({
            'prediction': label,
            'probability': float(prediction_proba)
        })

    except Exception as e:
        logger.exception(f"Unexpected error during prediction: {e}")
        return jsonify({'error': 'An unexpected error occurred.'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    logger.debug("Health check requested.")
    return jsonify({'status': 'Server is running.'}), 200

# Serve React build for production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the React frontend in production."""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        logger.debug(f"Serving static file: {path}")
        return send_from_directory(app.static_folder, path)
    else:
        logger.debug("Serving React index.html")
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Use environment variables for host and port, or default to localhost:5000
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    logger.info(f"Starting Flask server on {HOST}:{PORT} with DEBUG={DEBUG}")
    app.run(host=HOST, port=PORT, debug=DEBUG)
