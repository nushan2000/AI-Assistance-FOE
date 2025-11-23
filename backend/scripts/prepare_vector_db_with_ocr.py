import os
import re
import time
import platform
import numpy as np
from pyprojroot import here
from PIL import Image
from pdf2image import convert_from_path
import pytesseract
from tabulate import tabulate
from sklearn.metrics.pairwise import cosine_similarity

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

# ===============================
# Configure Tesseract (Windows)
# ===============================
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"

# ===============================
# Configure Poppler path (Windows)
# ===============================
if platform.system() == "Windows":
    POPPLER_PATH = r"C:\Release-25.11.0-0\poppler-25.11.0\Library\bin"  # <-- set your Poppler bin path here
else:
    POPPLER_PATH = None

# ===============================
# Preprocessing Function
# ===============================
def clean_text(text: str) -> str:
    """
    Cleans extracted text before chunking:
    - Remove headers/footers (batch/year lines)
    - Remove excessive dot leaders (TOC)
    - Fix only *true* word splits (hyphenation or line-break splits)
    - Preserve normal spaces and paragraph boundaries
    """
    text = text.replace("\u00ad", "")  # remove soft hyphens
    text = re.sub(r"\.{4,}", " ", text)  # remove dot leaders
    text = re.sub(
        r"(?im)^[^\n]*Academic\s*Year\s*20\d{2}\s*/\s*20\d{2}[^\n]*Batch[^\n]*\n?",
        "",
        text,
    )
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)  # fix hyphenated words
    text = re.sub(r"([a-z])\s*\n\s*([a-z])", r"\1\2", text)  # fix line breaks in words
    text = re.sub(r"[ \t]+", " ", text)  # collapse spaces
    text = re.sub(r"\n{3,}", "\n\n", text).strip()  # normalize paragraph breaks
    return text

# ===============================
# Load PDF with OCR
# ===============================
def load_pdf_with_ocr(pdf_path: str):
    """
    Converts PDF pages to images and applies OCR
    """
    print(f"OCR Extracting → {os.path.basename(pdf_path)}")
    pages = convert_from_path(pdf_path, dpi=300, poppler_path=POPPLER_PATH)

    ocr_texts = []
    for page in pages:
        text = pytesseract.image_to_string(page, lang="eng")
        ocr_texts.append(text)
    return ocr_texts

# ===============================
# Main VectorDB Class
# ===============================
class PrepareVectorDBOCR:
    def __init__(self, name, doc_dir, vectordb_dir, collection_name, volume_files=None, chunk_size=400, chunk_overlap=60, embedding_model="intfloat/e5-base-v2"):
        self.name = name
        self.doc_dir = doc_dir
        self.vectordb_dir = vectordb_dir
        self.collection_name = collection_name
        self.volume_files = volume_files or []
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedding_model = embedding_model

    def path_maker(self, file_name: str) -> str:
        return os.path.join(here(self.doc_dir), file_name)

    def run(self, test_queries, k=3):
        print(f"\n=== Running for {self.name} [{self.embedding_model}] ===")
        if not os.path.exists(here(self.vectordb_dir)):
            os.makedirs(here(self.vectordb_dir))
            print(f"Directory '{self.vectordb_dir}' created.")

        docs_list = []

        # Load PDF(s) with OCR
        if self.volume_files:
            for file_name in self.volume_files:
                pdf_path = self.path_maker(file_name)
                ocr_pages = load_pdf_with_ocr(pdf_path)
                volume_tag = "Vol I" if "I" in file_name else "Vol II"
                for text in ocr_pages:
                    doc = Document(page_content=clean_text(text), metadata={"volume": volume_tag, "source": file_name})
                    docs_list.append(doc)
        else:
            for fn in os.listdir(here(self.doc_dir)):
                pdf_path = self.path_maker(fn)
                ocr_pages = load_pdf_with_ocr(pdf_path)
                for text in ocr_pages:
                    doc = Document(page_content=clean_text(text), metadata={"source": fn})
                    docs_list.append(doc)

        # Chunk the text
        text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap
        )
        doc_splits = text_splitter.split_documents(docs_list)

        # Embedding
        embedder = HuggingFaceEmbeddings(model_name=self.embedding_model)

        # Create VectorDB
        start_time = time.time()
        vectordb = Chroma.from_documents(
            documents=doc_splits,
            collection_name=self.collection_name,
            embedding=embedder,
            persist_directory=str(here(self.vectordb_dir)),
        )
        end_time = time.time()

        num_vectors = vectordb._collection.count()
        embed_time = round(end_time - start_time, 2)

        # Avg cosine similarity
        retriever = vectordb.as_retriever(search_kwargs={"k": k})
        cosines = []
        for q in test_queries:
            retrieved_docs = retriever.invoke(q)
            query_embedding = embedder.embed_query(q)
            sims = [
                cosine_similarity([query_embedding], [embedder.embed_query(doc.page_content)])[0][0]
                for doc in retrieved_docs
            ]
            cosines.append(np.mean(sims))
        avg_cosine = float(np.mean(cosines))

        # Table output
        table_data = [
            ["Model", self.embedding_model],
            ["Chunk Size", self.chunk_size],
            ["Chunk Overlap", self.chunk_overlap],
            ["Documents Loaded", len(docs_list)],
            ["Total Chunks", len(doc_splits)],
            ["Number of Vectors", num_vectors],
            ["Embedding Time (s)", embed_time],
            ["Avg Cosine Similarity", round(avg_cosine, 4)],
        ]
        print(tabulate(table_data, headers=["Metric", "Value"], tablefmt="pretty"))
        print("VectorDB created and evaluated.\n")

        return {
            "Document": self.name,
            "Model": self.embedding_model,
            "Chunk Size": self.chunk_size,
            "Overlap": self.chunk_overlap,
            "Documents Loaded": len(docs_list),
            "Total Chunks": len(doc_splits),
            "Embedding Time (s)": embed_time,
            "Avg Cosine": avg_cosine,
        }
