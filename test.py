import time
import keyboard
from selenium import webdriver
from selenium.webdriver.common.by import By

# Java code to type
java_code = """
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int num = sc.nextInt();
        System.out.println(findNthTerm(num));
    }

    public static String findNthTerm(int num) {
        String[] digits = {"3", "4"};
        String result = "";
        while (num > 0) {
            num--; // Adjusting to 0-based index
            result = digits[num % 2] + result;
            num /= 2;
        }
        return result;
    }
}
"""

# Initialize the WebDriver
driver = webdriver.Chrome()
driver.maximize_window()

try:
    # Open the given link
    driver.get("https://lms.talentely.com/test/test/55ef1f61-0799-488e-a5ea-21291618a558/e436317b-6ac1-4fb7-92f5-5077823ea418")
    time.sleep(30)  # Wait for the user to manually log in (adjust time as needed)

    # Locate the code editor
    editor = driver.find_element(By.CSS_SELECTOR, "textarea")  # Update this if necessary
    editor.click()

    # Type the Java code into the editor
    for line in java_code.splitlines():
        keyboard.write(line)
        keyboard.press_and_release('enter')
        time.sleep(0.1)  # Delay to mimic human typing

    print("Code typed successfully.")

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    time.sleep(10)  # Wait before closing the browser to verify the result
    driver.quit()