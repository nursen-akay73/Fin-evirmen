import os

from dotenv import load_dotenv

load_dotenv()

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)
EMBEDDING_DIM = 384
RERANKER_MODEL = os.getenv(
    "RERANKER_MODEL",
    "cross-encoder/ms-marco-MiniLM-L-6-v2",
)
RERANK_CANDIDATES = 10
RERANK_TOP_K = 3
VISION_MODEL = os.getenv(
    "VISION_MODEL",
    "meta-llama/llama-4-scout-17b-16e-instruct",
)
SECRET_KEY = os.getenv("SECRET_KEY", "fincevirmen-dev-secret")
CONTRACT_SESSION_TTL = 30 * 60
CONTRACT_MAX_FILES = 3
CONTRACT_MAX_CHUNKS_PER_DOC = 12
