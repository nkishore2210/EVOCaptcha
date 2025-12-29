from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from gif_generator import generate_gif_with_coordinates
from validation_utils import validate_coordinates

app = Flask(__name__)
CORS(app)

# Store the stationary dot coordinates globally for validation
stationary_dot_coords = None

@app.route('/generate-gif', methods=['GET'])
def generate_gif_route():
    global stationary_dot_coords
    print("Generating GIF...")
    gif_buffer, stationary_dot_coords = generate_gif_with_coordinates()
    print(f"Stationary Dot Coordinates: {stationary_dot_coords}")
    response = send_file(
        gif_buffer,
        mimetype='image/gif',
        as_attachment=False,
        download_name="dynamic_balls.gif",
    )
    print("GIF sent to frontend.")
    return response

@app.route('/validate-click', methods=['POST'])
def validate_click():
    global stationary_dot_coords
    request_data = request.get_json()
    if not request_data or 'user_coordinates' not in request_data:
        return jsonify({"error": "Invalid request. Coordinates are required"}), 400

    user_coords = request_data['user_coordinates']
    is_valid = validate_coordinates(user_coords, stationary_dot_coords, margin=20)

    return jsonify({"valid": is_valid, "stationary_dot": stationary_dot_coords})

if __name__ == "__main__":
    app.run(debug=True)
