import os
import joblib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import numpy as np
import logging
from dotenv import load_dotenv
from marshmallow import Schema, fields, ValidationError

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build", static_url_path="")
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Paths for models
SCALER_PATH = 'scaler.joblib'
KMEANS_PATH = 'kmeans.joblib'
LOGREG_PATH = 'logreg.joblib'

# Load models
try:
    scaler = joblib.load(SCALER_PATH)
    kmeans = joblib.load(KMEANS_PATH)
    logreg = joblib.load(LOGREG_PATH)
    logger.info("Models loaded successfully.")
except Exception as e:
    logger.error(f"Error loading models: {e}")
    scaler, kmeans, logreg = None, None, None

# Define schemas
class TimePerFieldSchema(Schema):
    # Assuming only 'aadhaarNumber' is part of Time_per_Field
    aadhaarNumber = fields.Float(required=False)
    # If more fields are present, add them here accordingly

class PredictionSchema(Schema):
    Mouse_Speed = fields.Float(required=True)
    Movement_Smoothness = fields.Float(required=True)
    Acceleration = fields.Float(required=True)
    Direction_Changes = fields.Integer(required=True)
    Session_Duration = fields.Float(required=True)
    Total_Session_Time = fields.Float(required=True)
    Time_per_Field = fields.Dict(keys=fields.Str(), values=fields.Float(), required=False)
    Time_to_Submit = fields.Float(required=True)
    Typing_Speed = fields.Float(required=True)
    Inter_Key_Interval = fields.Float(required=True)
    Keystroke_Duration = fields.Float(required=True)
    Typing_Variability = fields.Float(required=True)
    Click_Interval = fields.Float(required=True)
    Click_Rate = fields.Float(required=True)
    Click_Consistency = fields.Float(required=True)
    Sequence_of_Clicks = fields.Integer(required=True)  # Changed to Integer (count)
    Idle_Time_Between_Actions = fields.Float(required=True)
    Idle_Time_Before_CAPTCHA = fields.Float(required=True)
    Total_Idle_Time = fields.Float(required=True)
    Rhythmic_Typing_Score = fields.Float(required=True)
    Backspace_Count = fields.Integer(required=True)

prediction_schema = PredictionSchema()

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if not request.is_json:
            logger.warning("Request Content-Type is not 'application/json'")
            return jsonify({'error': "Content-Type must be 'application/json'"}), 400

        data = request.get_json()
        logger.debug(f"Received data: {data}")

        # Validate incoming data
        validated_data = prediction_schema.load(data)
        logger.debug("Data validation successful.")

        # Extract features in the same order as used during training
        # Ensure that the order matches the scaler and model training
        features = [
            validated_data.get('Mouse_Speed', 0.0),
            validated_data.get('Movement_Smoothness', 0.0),
            validated_data.get('Acceleration', 0.0),
            validated_data.get('Direction_Changes', 0),
            validated_data.get('Session_Duration', 0.0),
            validated_data.get('Total_Session_Time', 0.0),
            validated_data.get('Time_to_Submit', 0.0),
            validated_data.get('Typing_Speed', 0.0),
            validated_data.get('Inter_Key_Interval', 0.0),
            validated_data.get('Keystroke_Duration', 0.0),
            validated_data.get('Typing_Variability', 0.0),
            validated_data.get('Click_Interval', 0.0),
            validated_data.get('Click_Rate', 0.0),
            validated_data.get('Click_Consistency', 0.0),
            validated_data.get('Sequence_of_Clicks', 0),
            validated_data.get('Idle_Time_Between_Actions', 0.0),
            validated_data.get('Idle_Time_Before_CAPTCHA', 0.0),
            validated_data.get('Total_Idle_Time', 0.0),
            validated_data.get('Rhythmic_Typing_Score', 0.0),
            validated_data.get('Backspace_Count', 0),
            # If 'Time_per_Field' needs to be included as a single feature, process it accordingly
            # For example, sum of times or specific field time
            sum(validated_data.get('Time_per_Field', {}).values()) if validated_data.get('Time_per_Field') else 0.0
        ]

        logger.debug(f"Feature list before scaling: {features}")

        # Ensure that the number of features matches the scaler's expectation
        if len(features) != 21:
            logger.error(f"Feature count mismatch: Expected 21, got {len(features)}")
            return jsonify({'error': f"Feature count mismatch: Expected 21, got {len(features)}"}), 400

        # Scale features
        scaled_features = scaler.transform([features])
        logger.debug(f"Scaled features: {scaled_features}")

        # Predict cluster using KMeans
        cluster_label = int(kmeans.predict(scaled_features)[0])  # Convert to int
        logger.debug(f"Cluster Label: {cluster_label}")

        # Predict bot or human using Logistic Regression
        prediction = int(logreg.predict(scaled_features)[0])     # Convert to int
        probability = float(logreg.predict_proba(scaled_features)[0][1])  # Convert to float
        logger.debug(f"Prediction: {'bot' if prediction == 0 else 'human'}, Probability: {probability}")

        return jsonify({
            'prediction': 'human' if prediction == 1 else 'bot',
            'probability': probability,
            'cluster_label': cluster_label
        }), 200

    except ValidationError as ve:
        logger.error(f"Validation error: {ve.messages}")
        return jsonify({'error': ve.messages}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500

# Serve React Frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
