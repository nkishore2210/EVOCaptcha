import os
import joblib
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import logging
from dotenv import load_dotenv
from marshmallow import Schema, fields, ValidationError
from io import BytesIO

# Import for CAPTCHA
from gif_generator import generate_gif_with_coordinates
from validation_utils import validate_coordinates

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

# Define base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Paths for models
SCALER_LR_PATH = os.path.join(BASE_DIR,'scaler_lr.joblib')
LOGREG_PATH = os.path.join(BASE_DIR,'logistic_regression_model.joblib')
RF_MODEL_PATH = os.path.join(BASE_DIR,'rf_model.joblib')
XGB_MODEL_PATH = os.path.join(BASE_DIR,'xgb_model.joblib')
SCALER_HV_PATH = os.path.join(BASE_DIR,'scaler.joblib')
# KMEANS_PATH = os.path.join(BASE_DIR, 'models', 'kmeans.joblib')  # Uncomment if you have this model

# Initialize models as None
scaler_lr = logreg = rf_model = xgb_model = scaler_hv = None

# Load models individually with separate try-except blocks
try:
    scaler_lr = joblib.load(SCALER_LR_PATH)
    logger.info(f"Loaded scaler_lr from {SCALER_LR_PATH}")
except Exception as e:
    logger.error(f"Failed to load scaler_lr from {SCALER_LR_PATH}: {e}")

try:
    logreg = joblib.load(LOGREG_PATH)
    logger.info(f"Loaded logreg from {LOGREG_PATH}")
except Exception as e:
    logger.error(f"Failed to load logreg from {LOGREG_PATH}: {e}")

try:
    rf_model = joblib.load(RF_MODEL_PATH)
    logger.info(f"Loaded rf_model from {RF_MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load rf_model from {RF_MODEL_PATH}: {e}")

try:
    xgb_model = joblib.load(XGB_MODEL_PATH)
    logger.info(f"Loaded xgb_model from {XGB_MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load xgb_model from {XGB_MODEL_PATH}: {e}")

try:
    scaler_hv = joblib.load(SCALER_HV_PATH)
    logger.info(f"Loaded scaler_hv from {SCALER_HV_PATH}")
except Exception as e:
    logger.error(f"Failed to load scaler_hv from {SCALER_HV_PATH}: {e}")

# Verify that all essential models are loaded
essential_models = [scaler_lr, logreg]
second_layer_models = [scaler_hv, rf_model, xgb_model]

if not all(essential_models):
    logger.critical("One or more essential first-layer models failed to load. Shutting down the application.")
    exit(1)  # Exit the application if essential models are not loaded

# Define schemas
class PredictionSchema(Schema):
    # Lightweight features
    Mouse_Speed = fields.Float(required=True)
    Movement_Smoothness = fields.Float(required=True)
    Direction_Changes = fields.Integer(required=True)
    Typing_Speed = fields.Float(required=True)
    Inter_Key_Interval = fields.Float(required=True)
    Path_Deviation = fields.Float(required=True)
    Backspace_Count = fields.Integer(required=True)
    Rhythmic_Typing_Score = fields.Float(required=True)
    
    # Heavyweight features
    Acceleration = fields.Float(required=True)
    Total_Session_Time = fields.Float(required=True)
    Time_per_Field = fields.Dict(keys=fields.Str(), values=fields.Float(), required=False)
    Time_to_Submit = fields.Float(required=True)
    Keystroke_Duration = fields.Float(required=True)
    Typing_Variability = fields.Float(required=True)
    Click_Rate = fields.Float(required=True)
    Click_Consistency = fields.Float(required=True)
    Click_Interval = fields.Float(required=True)
    Sequence_of_Clicks = fields.Integer(required=True)
    Idle_Time_Between_Actions = fields.Float(required=True)
    Idle_Time_Before_CAPTCHA = fields.Float(required=True)
    Total_Idle_Time = fields.Float(required=True)

prediction_schema = PredictionSchema()

# Store the stationary dot coordinates globally for CAPTCHA validation
stationary_dot_coords = None

def ensemble_predict(input_row):
    """
    Ensemble prediction using XGBoost and Random Forest models.
    Returns the final prediction ("Human" or "Bot") based on average probability.
    """
    if scaler_hv is None or rf_model is None or xgb_model is None:
        logger.error("One or more second-layer models are not loaded.")
        raise Exception("Second-layer models not loaded.")

    # Preprocess input
    input_row_scaled = scaler_hv.transform([input_row])
    logger.debug(f"Scaled features for Ensemble: {input_row_scaled}")

    # Predict probabilities
    xgb_prob = xgb_model.predict_proba(input_row_scaled)[:, 1]
    rf_prob = rf_model.predict_proba(input_row_scaled)[:, 1]
    logger.debug(f"XGBoost Probability: {xgb_prob[0]}, Random Forest Probability: {rf_prob[0]}")

    # Ensemble voting (average probabilities)
    final_prob = (xgb_prob + rf_prob) / 2
    logger.debug(f"Final Ensemble Probability: {final_prob[0]}")

    # Classification threshold
    final_prediction = "Human" if final_prob[0] > 0.5 else "Bot"
    logger.debug(f"Final Ensemble Prediction: {final_prediction}")

    return final_prediction, final_prob[0]

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

        # Extract all features
        features = [
            validated_data.get('Mouse_Speed', 0.0),
            validated_data.get('Movement_Smoothness', 0.0),
            validated_data.get('Direction_Changes', 0),
            validated_data.get('Typing_Speed', 0.0),
            validated_data.get('Inter_Key_Interval', 0.0),
            validated_data.get('Path_Deviation', 0.0),
            validated_data.get('Backspace_Count', 0),
            validated_data.get('Rhythmic_Typing_Score', 0.0),
            # Heavyweight features
            validated_data.get('Acceleration', 0.0),
            validated_data.get('Total_Session_Time', 0.0),
            sum(validated_data.get('Time_per_Field', {}).values()) if validated_data.get('Time_per_Field') else 0.0,
            validated_data.get('Time_to_Submit', 0.0),
            validated_data.get('Keystroke_Duration', 0.0),
            validated_data.get('Typing_Variability', 0.0),
            validated_data.get('Click_Rate', 0.0),
            validated_data.get('Click_Consistency', 0.0),
            validated_data.get('Click_Interval', 0.0),
            validated_data.get('Sequence_of_Clicks', 0),
            validated_data.get('Idle_Time_Between_Actions', 0.0),
            validated_data.get('Idle_Time_Before_CAPTCHA', 0.0),
            validated_data.get('Total_Idle_Time', 0.0),
        ]

        logger.debug(f"Feature list before scaling: {features}")

        # Separate the features into lightweight and heavyweight
        lightweight_features = features[:8]  # First 8 features
        heavyweight_features = features[8:]  # Next 13 features

        # Ensure that the lightweight features match the scaler's expectation
        if scaler_lr is None:
            logger.error("scaler_lr is not loaded.")
            return jsonify({'error': "Internal server error: Scaler not loaded."}), 500

        expected_lightweight_features = 8  # As per model's expectation
        actual_lightweight_features = len(lightweight_features)
        if actual_lightweight_features != expected_lightweight_features:
            logger.error(f"Lightweight feature count mismatch: Expected {expected_lightweight_features}, got {actual_lightweight_features}")
            return jsonify({'error': f"Lightweight feature count mismatch: Expected {expected_lightweight_features}, got {actual_lightweight_features}"}), 400

        # Scale lightweight features using the first scaler
        scaled_features_lr = scaler_lr.transform([lightweight_features])
        logger.debug(f"Scaled features for Logistic Regression: {scaled_features_lr}")

        # Predict using the first layer (Logistic Regression)
        prediction_lr = int(logreg.predict(scaled_features_lr)[0])  # 1 for human, 0 for bot
        probability_lr = float(logreg.predict_proba(scaled_features_lr)[0][1])  # Probability of being human
        logger.debug(f"First Layer Prediction: {'Human' if prediction_lr == 1 else 'Bot'}, Probability: {probability_lr}")

        if prediction_lr == 0:
            # Bot detected in the first layer
            return jsonify({
                'prediction': 'Bot',
                'probability': probability_lr,
                'cluster_label': None
            }), 200
        else:
            # Proceed to second layer using ensemble prediction
            second_layer_features = heavyweight_features
            logger.debug(f"Second Layer Features: {second_layer_features}")

            if scaler_hv is None:
                logger.error("scaler_hv is not loaded.")
                return jsonify({'error': "Internal server error: Second-layer scaler not loaded."}), 500

            expected_heavyweight_features = 13
            actual_heavyweight_features = len(second_layer_features)
            if actual_heavyweight_features != expected_heavyweight_features:
                logger.error(f"Heavyweight feature count mismatch: Expected {expected_heavyweight_features}, got {actual_heavyweight_features}")
                return jsonify({'error': f"Heavyweight feature count mismatch: Expected {expected_heavyweight_features}, got {actual_heavyweight_features}"}), 400

            try:
                final_prediction, final_prob = ensemble_predict(second_layer_features)
            except Exception as e:
                logger.error(f"Ensemble prediction failed: {e}")
                return jsonify({'error': 'Internal server error during second-layer prediction.'}), 500

            return jsonify({
                'prediction': final_prediction,
                'probability': final_prob,
                'cluster_label': None
            }), 200

    except ValidationError as ve:
        logger.error(f"Validation Error: {ve.messages}")
        return jsonify({'error': ve.messages}), 400
    except Exception as e:
        logger.error(f"Unexpected error during prediction: {e}")
        return jsonify({'error': 'An unexpected error occurred during prediction.'}), 500

@app.route('/generate-gif', methods=['GET'])
def generate_gif_route():
    global stationary_dot_coords
    logger.info("Generating GIF for CAPTCHA...")
    try:
        gif_buffer, stationary_dot_coords = generate_gif_with_coordinates()
        logger.debug(f"Stationary Dot Coordinates: {stationary_dot_coords}")
        response = send_file(
            gif_buffer,
            mimetype='image/gif',
            as_attachment=False,
            download_name="dynamic_balls.gif",
        )
        logger.info("GIF sent to frontend.")
        return response
    except Exception as e:
        logger.error(f"Failed to generate GIF: {e}")
        return jsonify({'error': 'Failed to generate CAPTCHA GIF.'}), 500

@app.route('/validate-click', methods=['POST'])
def validate_click():
    global stationary_dot_coords
    request_data = request.get_json()
    if not request_data or 'user_coordinates' not in request_data:
        logger.warning("Invalid request: 'user_coordinates' key is required.")
        return jsonify({"error": "Invalid request. 'user_coordinates' is required in the JSON payload"}), 400

    user_coords = request_data['user_coordinates']

    # Check if x and y keys exist within user_coordinates
    if 'x' not in user_coords or 'y' not in user_coords:
        logger.warning("Invalid request: 'x' and 'y' coordinates are missing.")
        return jsonify({"error": "Invalid request. Both 'x' and 'y' coordinates are required"}), 400

    is_valid = validate_coordinates(user_coords, stationary_dot_coords, base_radius=30, extra_margin=100)

    logger.debug(f"User Click Coordinates: {user_coords}, Stationary Dot: {stationary_dot_coords}, Valid: {is_valid}")

    return jsonify({"valid": is_valid, "stationary_dot": stationary_dot_coords}), 200

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_file(os.path.join(app.static_folder, path))
    else:
        return send_file(os.path.join(app.static_folder, 'index.html'))

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
