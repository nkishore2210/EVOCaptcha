from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
import time
import random

# Set up the browser and navigate to the website
def setup_browser(url):
    driver = webdriver.Chrome()  # Replace with your WebDriver (e.g., Firefox, Edge)
    driver.get(url)
    driver.maximize_window()
    return driver

# Mimic random mouse movements within the page
def mimic_mouse_movement(driver, duration=10):
    action = ActionChains(driver)
    start_time = time.time()

    # Get the size of the browser window
    width = driver.execute_script("return window.innerWidth")
    height = driver.execute_script("return window.innerHeight")

    while time.time() - start_time < duration:
        # Generate random positions within the browser window
        x = random.randint(0, width)
        y = random.randint(0, height)

        # Move the mouse to the random position
        action.move_by_offset(x - action.x_offset, y - action.y_offset).perform()
        time.sleep(random.uniform(0.1, 0.5))  # Add a small delay

        # Optionally, hover over a specific element
        elements = driver.find_elements_by_tag_name("a")  # Example: Hover over links
        if elements:
            random.choice(elements).location_once_scrolled_into_view
            action.move_to_element(random.choice(elements)).perform()
            time.sleep(random.uniform(0.5, 1))

# Main function
if __name__ == "__main__":
    url = "https://example.com"  # Replace with the target website URL
    driver = setup_browser(url)

    try:
        mimic_mouse_movement(driver, duration=15)
    finally:
        driver.quit()
