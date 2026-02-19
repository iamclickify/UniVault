import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try alternate location if root one failed, though it should be in root now
    load_dotenv("app/backend/.env")
    api_key = os.getenv("GEMINI_API_KEY")

print(f"Key found: {'Yes' if api_key else 'No'}")

if api_key:
    genai.configure(api_key=api_key)
    print("Listing ALL available models:")
    try:
        for m in genai.list_models():
            print(f"Model: {m.name}")
            print(f"Methods: {m.supported_generation_methods}")
            print("-" * 10)
    except Exception as e:
        print(f"Error listing models: {e}")
