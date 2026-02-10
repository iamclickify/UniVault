import os
import warnings
# Suppress Google Generative AI deprecation warning
warnings.filterwarnings("ignore", category=FutureWarning)

import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader

class RAGEngine:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("API Key is required for RAGEngine")
        
        self.api_key = api_key
        # Set environment variable for ChromaDB's embedding function
        os.environ["CHROMA_GOOGLE_GENAI_API_KEY"] = self.api_key
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Initialize ChromaDB (Persistent)
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        # Use a Google Generative AI embedding function if available or a compatible one
        # For simplicity in this demo, we might use a default or setup specific
        # Note: chromadb.utils.embedding_functions.GoogleGenerativeAIEmbeddingFunction exists properly
        
        self.embedding_fn = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
            api_key=self.api_key
        )
        
        self.collection = self.chroma_client.create_collection(
            name="univault_docs",
            embedding_function=self.embedding_fn,
            get_or_create=True
        )

    def ingest_file(self, file_path):
        """Reads a PDF, chunks it, and stores in Vector DB."""
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        # Simple chunking
        chunk_size = 1000
        overlap = 100
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunks.append(text[i:i + chunk_size])
            
        # Add to ChromaDB
        ids = [f"{os.path.basename(file_path)}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file_path, "chunk_id": i} for i in range(len(chunks))]
        
        self.collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        
        return len(chunks)

    def query(self, query_text):
        """Retrieves context and generates answer."""
        # 1. Retrieve relevant docs
        results = self.collection.query(
            query_texts=[query_text],
            n_results=3
        )
        
        context_list = results['documents'][0]
        context = "\n\n".join(context_list)
        
        # 2. Construct Prompt
        prompt = f"""
        You are an intelligent assistant for UniVault. Use the following context to answer the user's question.
        If the answer is not in the context, say so, but try to be helpful with general knowledge if applicable but mark it as general info.
        
        Context:
        {context}
        
        User Question: {query_text}
        
        Answer:
        """
        
        # 3. Generate Response
        response = self.model.generate_content(prompt)
        return response.text
