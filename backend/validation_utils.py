import math

def validate_coordinates(user_coords, stationary_coords, base_radius=30, extra_margin=100):
    """
    Validate if the user's click is within an extended radius around the stationary dot.

    - `user_coords`: The (x, y) click position.
    - `stationary_coords`: The (x, y) position of the stationary dot.
    - `base_radius`: The original dot radius at full size.
    - `extra_margin`: Additional margin for more forgiving clicks.

    Returns True if the click is valid.
    """
    allowed_distance = base_radius + extra_margin  # Increase the click range
    actual_distance = math.dist((user_coords['x'], user_coords['y']), stationary_coords)

    print(f"🟢 Allowed click range: {allowed_distance}px")
    print(f"🔵 Actual click distance: {actual_distance}px")
    print(f"🔴 User clicked at: {user_coords}")
    print(f"🟣 Stationary dot at: {stationary_coords}")

    if actual_distance <= allowed_distance:
        print("✅ Click is valid!")
        return True
    else:
        print("❌ Validation Failed! Click outside the allowed range.")
        return False
