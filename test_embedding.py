import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
# Also try loading from parent if not found (just in case)
if not os.getenv("GEMINI_API_KEY"):
    load_dotenv("../.env")

api_key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {'Yes' if api_key else 'No'}")

if api_key:
    genai.configure(api_key=api_key)

    print("Testing models/text-embedding-004...")
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content="Hello world",
            task_type="retrieval_document"
        )
        print("SUCCESS: models/text-embedding-004 works!")
    except Exception as e:
        print(f"FAILURE: models/text-embedding-004 failed: {e}")

    print("\nTesting models/embedding-001...")
    try:
        result = genai.embed_content(
            model="models/embedding-001",
            content="Hello world",
            task_type="retrieval_document"
        )
        print("SUCCESS: models/embedding-001 works!")
    except Exception as e:
        print(f"FAILURE: models/embedding-001 failed: {e}")
