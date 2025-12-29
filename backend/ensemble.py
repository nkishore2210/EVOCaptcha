import joblib
import numpy as np

# Load the saved models and scaler
xgb_model = joblib.load("xgb_model.pkl")
rf_model = joblib.load("rf_model.pkl")
scaler = joblib.load("scaler.pkl")

# Function to preprocess input, ensemble predictions, and classify
def predict_bot_or_human(input_row):
    # Preprocess input
    input_row_scaled = scaler.transform([input_row])
    
    # Predict probabilities
    xgb_prob = xgb_model.predict_proba(input_row_scaled)[:, 1]
    rf_prob = rf_model.predict_proba(input_row_scaled)[:, 1]
    
    # Ensemble voting (average probabilities)
    final_prob = (xgb_prob + rf_prob) / 2
    
    # Classification threshold
    return "Bot" if final_prob <= 0.5 else "Human"

# Example usage
new_input_row = [
    -19.05, 8.8, 7159.50, 8.8, 96.68, 513.01, 0.23, 0, 7167.90, 2, 0, 0, 0
]
result = predict_bot_or_human(new_input_row)
print("Prediction:", result)