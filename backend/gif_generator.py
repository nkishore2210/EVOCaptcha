from PIL import Image, ImageDraw
import numpy as np
import random
from io import BytesIO

def generate_gif_with_coordinates(canvas_size=512, dot_radius=50, num_frames=50):
    # Stationary dot coordinates
    stationary_ball = (
        random.randint(50, canvas_size - 50),
        random.randint(50, canvas_size - 50),
    )
    
    # Random number of moving objects (3-5)
    num_moving_balls = random.randint(3, 5)
    moving_balls = [
        (
            random.randint(50, canvas_size - 50),
            random.randint(50, canvas_size - 50),
        )
        for _ in range(num_moving_balls)
    ]

    # Define motion properties for moving balls
    radii = [random.randint(50, canvas_size // 4) for _ in range(num_moving_balls)]
    angles = [np.linspace(0, 2 * np.pi, num_frames, endpoint=False) for _ in range(num_moving_balls)]
    phase_shifts = [random.uniform(0, 2 * np.pi) for _ in range(num_moving_balls)]

    # Define breathing effect for the stationary dot:
    # half of the frames decreasing radius from full to zero, and next half increasing from zero to full
    half_frames = num_frames // 2
    breathing_cycle = np.linspace(1, 0, half_frames).tolist() + np.linspace(0, 1, half_frames).tolist()

    frames = []
    for frame_index in range(num_frames):
        img = Image.new("RGB", (canvas_size, canvas_size), "white")
        draw = ImageDraw.Draw(img)

        # Determine scaled radius based on breathing
        stationary_scale = breathing_cycle[frame_index % len(breathing_cycle)]
        scaled_radius = dot_radius * stationary_scale
        if scaled_radius > 0:
            draw.ellipse(
                (
                    stationary_ball[0] - scaled_radius,
                    stationary_ball[1] - scaled_radius,
                    stationary_ball[0] + scaled_radius,
                    stationary_ball[1] + scaled_radius,
                ),
                fill="black",
            )

        # Draw moving balls
        for i, (cx, cy) in enumerate(moving_balls):
            angle = angles[i][frame_index % len(angles[i])] + phase_shifts[i]
            x = cx + radii[i] * np.cos(angle)
            y = cy + radii[i] * np.sin(angle)
            draw.ellipse(
                (
                    x - dot_radius,
                    y - dot_radius,
                    x + dot_radius,
                    y + dot_radius,
                ),
                fill="black",
            )

        frames.append(img)

    # Save GIF to a BytesIO buffer
    gif_buffer = BytesIO()
    frames[0].save(
        gif_buffer,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=40,  # frame duration
        loop=0,
    )
    gif_buffer.seek(0)
    return gif_buffer, stationary_ball

def is_click_inside_stationary_dot(click_x, click_y, dot_x, dot_y, tolerance=40):
    return (click_x - dot_x) ** 2 + (click_y - dot_y) ** 2 <= tolerance ** 2