from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from rag_engine import RAGEngine

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Explicitly allow all origins and common headers for production
CORS(app, resources={r"/*": {"origins": "*"}})

@app.before_request
def log_request():
    print(f"DEBUG: Incoming {request.method} request to {request.path}")
    if request.is_json:
        print(f"DEBUG: Payload: {request.json}")

# Initialize RAG Engine
# You might want to initialize with an API key from env
api_key = os.getenv("GEMINI_API_KEY")
rag_engine = RAGEngine(api_key=api_key)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "UniVault RAG Backend"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_query = data.get('query')
        if not user_query:
            return jsonify({"error": "No query provided"}), 400

        # Use RAG engine to get response
        response = rag_engine.query(user_query)
        
        return jsonify({"response": response})
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_document():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if file:
            # Save file temporarily
            upload_folder = 'uploads'
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            
            file_path = os.path.join(upload_folder, file.filename)
            file.save(file_path)
            
            # Process file with RAG engine
            num_chunks = rag_engine.ingest_file(file_path)
            
            # Clean up (optional, depends on if you want to keep files)
            # os.remove(file_path)
            
            return jsonify({"message": f"Successfully processed {file.filename}", "chunks": num_chunks})
            
    except Exception as e:
        print(f"Error in upload endpoint: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("\n✅ RAG Backend is running!")
    print(f"   - API listening on: http://localhost:{port}")
    print("   - NOW: Open 'home/index.html' with Live Server to use the app.\n")
    app.run(host='0.0.0.0', port=port, debug=True)
