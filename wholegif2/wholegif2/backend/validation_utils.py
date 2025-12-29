def validate_coordinates(user_coords, stationary_coords, margin=20):
    """Validate the user's clicked coordinates against the stationary dot coordinates."""
    return (
        stationary_coords[0] - margin <= user_coords['x'] <= stationary_coords[0] + margin and
        stationary_coords[1] - margin <= user_coords['y'] <= stationary_coords[1] + margin
    )
