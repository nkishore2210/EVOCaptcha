const BACKEND_URL = "http://127.0.0.1:5000";

async function fetchGIF() {
    try {
        const response = await fetch(`${BACKEND_URL}/generate-gif`);
        if (response.ok) {
            const gifBlob = await response.blob();
            const gifURL = URL.createObjectURL(gifBlob);
            document.getElementById("gif-container").src = gifURL;
        } else {
            console.error("Failed to fetch GIF:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching GIF:", error);
    }
}

async function validateClick(event) {
    const gifElement = document.getElementById("gif-container");
    const rect = gifElement.getBoundingClientRect();

    const userX = Math.round(event.clientX - rect.left);
    const userY = Math.round(event.clientY - rect.top);

    try {
        const response = await fetch(`${BACKEND_URL}/validate-click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_coordinates: { x: userX, y: userY } }),
        });

        const result = await response.json();
        const resultMessage = document.getElementById("result-message");
        resultMessage.style.display = "block";
        if (result.valid) {
            resultMessage.textContent = "Validation Successful! You clicked the stationary dot!";
            resultMessage.className = "result-message success";
        } else {
            resultMessage.textContent = `Validation Failed! Try again. You clicked: (${userX}, ${userY}), but stationary dot is at: (${result.stationary_dot[0]}, ${result.stationary_dot[1]})`;
            resultMessage.className = "result-message error";
        }
    } catch (error) {
        console.error("Error validating click:", error);
    }
}

fetchGIF();
document.getElementById("gif-container").addEventListener("click", validateClick);
