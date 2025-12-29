# backend/save_xgboost_model.py

import joblib
import xgboost as xgb
import os

def resave_model(existing_model_path, new_model_path):
    try:
        # Load the existing model
        model = joblib.load(existing_model_path)
        print("Existing XGBoost model loaded successfully.")

        # Check if the model is an XGBoost Booster
        if isinstance(model, xgb.Booster):
            booster = model
        else:
            booster = model.get_booster()
        
        # Save the model using the latest XGBoost's save_model method
        booster.save_model(new_model_path)
        print(f"Model re-saved successfully as {new_model_path}.")
    except FileNotFoundError:
        print(f"Error: The file {existing_model_path} does not exist.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    existing_model = 'xgboost_model.joblib'  # Path to your existing model
    new_model = 'xgboost_model_latest.json'  # Desired path for the new model

    # Ensure the existing model file exists
    if not os.path.exists(existing_model):
        print(f"Error: {existing_model} not found in the backend directory.")
    else:
        resave_model(existing_model, new_model)
