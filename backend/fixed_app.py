import os
import joblib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import numpy as np
import logging
from dotenv import load_dotenv
from marshmallow import Schema, fields, ValidationError
import sklearn
from sklearn.exceptions import NotFittedError
import traceback

# Load environment variables from .env file if present
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build", static_url_path="")
CORS(app)  # Enable CORS for all routes; consider restricting origins in production

# Configure logging to capture DEBUG level logs and write to a file
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Determine the absolute path to the backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Expected scikit-learn version used during model training
EXPECTED_SKLEARN_VERSION = "1.5.2"

# Absolute paths for models and scaler
SCALER_PATH = os.getenv('SCALER_PATH', os.path.join(BASE_DIR, 'scaler.joblib'))
KMEANS_PATH = os.getenv('KMEANS_PATH', os.path.join(BASE_DIR, 'kmeans.joblib'))
LOGREG_PATH = os.getenv('LOGREG_PATH', os.path.join(BASE_DIR, 'logreg.joblib'))

# Log the paths being used
logger.debug(f"Using Scaler Path: {SCALER_PATH}")
logger.debug(f"Using KMeans Path: {KMEANS_PATH}")
logger.debug(f"Using Logistic Regression Path: {LOGREG_PATH}")

# Function to check scikit-learn version
def check_sklearn_version():
    current_version = sklearn.__version__
    if current_version != EXPECTED_SKLEARN_VERSION:
        logger.warning(
            f"Inconsistent scikit-learn version: Expected {EXPECTED_SKLEARN_VERSION}, "
            f"but found {current_version}. This may lead to unexpected behavior."
        )
    else:
        logger.info(f"scikit-learn version {current_version} matches the expected version.")

# Perform scikit-learn version check
check_sklearn_version()

# Load the scaler
try:
    scaler = joblib.load(SCALER_PATH)
    logger.info("Scaler loaded successfully.")
except FileNotFoundError:
    logger.error(f"Scaler file not found at {SCALER_PATH}.")
    scaler = None
except NotFittedError:
    logger.error("Scaler has not been fitted yet.")
    scaler = None
except Exception as e:
    logger.error(f"Unexpected error loading scaler: {e}")
    scaler = None

# Load the KMeans model
try:
    kmeans = joblib.load(KMEANS_PATH)
    logger.info("KMeans model loaded successfully.")
except FileNotFoundError:
    logger.error(f"KMeans model file not found at {KMEANS_PATH}.")
    kmeans = None
except Exception as e:
    logger.error(f"Unexpected error loading KMeans model: {e}")
    kmeans = None

# Load the Logistic Regression model
try:
    logreg = joblib.load(LOGREG_PATH)
    logger.info("Logistic Regression model loaded successfully.")
except FileNotFoundError:
    logger.error(f"Logistic Regression model file not found at {LOGREG_PATH}.")
    logreg = None
except Exception as e:
    logger.error(f"Unexpected error loading Logistic Regression model: {e}")
    logreg = None

# Define a nested schema for Time_per_Field
class TimePerFieldSchema(Schema):
    # Define all form fields here. Example:
    username = fields.Float(required=True)
    password = fields.Float(required=True)
    email = fields.Float(required=True)
    # Add more fields as per your frontend data

# Define the main PredictionSchema
class PredictionSchema(Schema):
    Mouse_Speed = fields.Float(required=True)
    Movement_Smoothness = fields.Float(required=True)
    Acceleration = fields.Float(required=True)
    Direction_Changes = fields.Integer(required=True)
    Session_Duration = fields.Float(required=True)
    Total_Session_Time = fields.Float(required=True)
    Time_to_Submit = fields.Float(required=True)
    Typing_Speed = fields.Float(required=True)
    Inter_Key_Interval = fields.Float(required=True)
    Keystroke_Duration = fields.Float(required=True)
    Typing_Variability = fields.Float(required=True)
    Click_Interval = fields.Float(required=True)
    Click_Rate = fields.Float(required=True)
    Click_Consistency = fields.Float(required=True)
    Idle_Time_Between_Actions = fields.Float(required=True)
    Idle_Time_Before_CAPTCHA = fields.Float(required=True)
    Total_Idle_Time = fields.Float(required=True)
    Time_per_Field = fields.Nested(TimePerFieldSchema, required=True)
    Sequence_of_Clicks = fields.List(fields.Str(), required=True)
    # Remove 'aadhaarNumber' from the top level as it's now nested within Time_per_Field

# Initialize the schema
prediction_schema = PredictionSchema()

# Define the number of expected features
# This should match the number of features the scaler was trained on
EXPECTED_FEATURES_COUNT = 0
for field in PredictionSchema().fields.values():
    if isinstance(field, fields.Nested):
        # Access the fields of the nested schema without calling it
        nested_fields = field.schema.fields
        EXPECTED_FEATURES_COUNT += len(nested_fields)
    elif isinstance(field, fields.List):
        # Assuming list fields are encoded into multiple features (e.g., counts)
        # Adjust this based on how you encode Sequence_of_Clicks
        # For simplicity, let's assume it's encoded as counts for known click types
        known_click_types = ['left_click', 'right_click', 'double_click', 'middle_click']
        EXPECTED_FEATURES_COUNT += len(known_click_types)
    else:
        EXPECTED_FEATURES_COUNT += 1

logger.debug(f"Number of expected features: {EXPECTED_FEATURES_COUNT}")

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Check Content-Type
        if not request.is_json:
            logger.warning("Invalid Content-Type received.")
            return jsonify({'error': "Content-Type must be 'application/json'"}), 400
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}")

        # Parse input data
        data = request.get_json()
        if not data:
            logger.warning("No input data provided.")
            return jsonify({'error': 'No input data provided'}), 400

        logger.debug(f"Received data for prediction: {data}")

        # Validate data using Marshmallow schema
        try:
            validated_data = prediction_schema.load(data)
            logger.debug(f"Validated data: {validated_data}")
        except ValidationError as ve:
            logger.error(f"Validation errors: {ve.messages}")
            return jsonify({'error': ve.messages}), 400

        # Extract features
        features = []
        for feature in [
            'Mouse_Speed',
            'Movement_Smoothness',
            'Acceleration',
            'Direction_Changes',
            'Session_Duration',
            'Total_Session_Time',
            'Time_to_Submit',
            'Typing_Speed',
            'Inter_Key_Interval',
            'Keystroke_Duration',
            'Typing_Variability',
            'Click_Interval',
            'Click_Rate',
            'Click_Consistency',
            'Idle_Time_Between_Actions',
            'Idle_Time_Before_CAPTCHA',
            'Total_Idle_Time'
        ]:
            value = validated_data.get(feature)
            if value is None:
                logger.error(f"Missing feature: {feature}")
                return jsonify({'error': f"Missing feature: {feature}"}), 400
            features.append(value)

        # Handle 'Time_per_Field'
        time_per_field = validated_data.get('Time_per_Field', {})
        if not time_per_field:
            logger.error("Missing 'Time_per_Field' data.")
            return jsonify({'error': "Missing 'Time_per_Field' data."}), 400

        # Flatten 'Time_per_Field' by appending each field's time
        for field_name, time_value in time_per_field.items():
            if time_value is None:
                logger.error(f"Missing time value for field: {field_name}")
                return jsonify({'error': f"Missing time value for field: {field_name}"}), 400
            features.append(time_value)

        # Handle 'Sequence_of_Clicks'
        sequence_of_clicks = validated_data.get('Sequence_of_Clicks', [])
        if not isinstance(sequence_of_clicks, list):
            logger.error("'Sequence_of_Clicks' must be a list.")
            return jsonify({'error': "'Sequence_of_Clicks' must be a list."}), 400

        # Encode 'Sequence_of_Clicks' as counts per click type
        click_counts = {}
        for click in sequence_of_clicks:
            click_counts[click] = click_counts.get(click, 0) + 1

        # Define known click types
        known_click_types = ['left_click', 'right_click', 'double_click', 'middle_click']
        for click_type in known_click_types:
            features.append(click_counts.get(click_type, 0))

        logger.debug(f"Extracted features: {features}")

        # Verify the number of features matches the scaler's expectation
        if len(features) != EXPECTED_FEATURES_COUNT:
            logger.error(
                f"Feature count mismatch: Expected {EXPECTED_FEATURES_COUNT}, but got {len(features)}."
            )
            return jsonify({'error': f"Feature count mismatch: Expected {EXPECTED_FEATURES_COUNT}, but got {len(features)}."}), 400

        # Convert to numpy array and reshape for scaler
        features_array = np.array(features).reshape(1, -1)
        logger.debug(f"Features array before scaling: {features_array}")

        # Scale the features
        if scaler:
            try:
                scaled_features = scaler.transform(features_array)
                logger.debug(f"Scaled features: {scaled_features}")
            except NotFittedError:
                logger.error("Scaler is not fitted.")
                return jsonify({'error': 'Scaler is not fitted. Contact the administrator.'}), 500
            except Exception as e:
                logger.error(f"Error during feature scaling: {e}")
                logger.debug(traceback.format_exc())
                return jsonify({'error': 'Error during feature scaling.'}), 500
        else:
            logger.error("Scaler is not loaded. Cannot proceed with prediction.")
            return jsonify({'error': 'Scaler not available. Contact the administrator.'}), 500

        # Assign cluster labels using KMeans
        if kmeans:
            try:
                cluster_label = kmeans.predict(scaled_features)
                logger.debug(f"Cluster label: {cluster_label[0]}")
            except Exception as e:
                logger.error(f"Error during KMeans prediction: {e}")
                logger.debug(traceback.format_exc())
                return jsonify({'error': 'Error during clustering.'}), 500
        else:
            logger.error("KMeans model is not loaded. Cannot assign cluster labels.")
            return jsonify({'error': 'KMeans model not available. Contact the administrator.'}), 500

        # Initialize response dictionary
        response = {}

        # Predict using Logistic Regression
        if logreg:
            try:
                logreg_pred = logreg.predict(scaled_features)
                logreg_proba = logreg.predict_proba(scaled_features)[0]
                logger.debug(f"Logistic Regression prediction: {logreg_pred[0]}, probabilities: {logreg_proba}")
                response['prediction'] = 'human' if logreg_pred[0] == 0 else 'bot'
                response['probability'] = float(logreg_proba[1])  # Probability of being a bot
            except Exception as e:
                logger.error(f"Error during Logistic Regression prediction: {e}")
                logger.debug(traceback.format_exc())
                return jsonify({'error': 'Error during prediction.'}), 500
        else:
            logger.error("Logistic Regression model is not loaded.")
            return jsonify({'error': 'Logistic Regression model not available. Contact the administrator.'}), 500

        # Add cluster label to the response
        response['cluster_label'] = int(cluster_label[0])

        logger.info(f"Prediction result: {response}")
        return jsonify(response), 200

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
