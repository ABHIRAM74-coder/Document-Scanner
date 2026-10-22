import os
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from document_reader import SUPPORTED, read_document
from bedrock import analyze

MAX_BYTES = 10 * 1024 * 1024
app = FastAPI(title='Bedrock Document Scanner Prototype')
origins = [s.strip() for s in os.getenv('ALLOWED_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500').split(',') if s.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'], allow_headers=['*'])

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/scan')
async def scan(file: UploadFile = File(...)):
    ext = Path(file.filename or '').suffix.lower().lstrip('.')
    if ext not in SUPPORTED:
        raise HTTPException(415, 'Unsupported file type')
    data = await file.read(MAX_BYTES + 1)
    await file.close()
    if not data:
        raise HTTPException(400, 'Empty file')
    if len(data) > MAX_BYTES:
        raise HTTPException(413, 'File exceeds 10 MB limit')
    try:
        extracted = read_document(file.filename, data)
        result = analyze(extracted)
        if extracted['warnings']:
            result['notes'] = (str(result.get('notes', '')) + ' ' + ' '.join(extracted['warnings'])).strip()
        return result
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        # Log internally without leaking credentials, source documents, or AWS details to clients.
        raise HTTPException(502, 'Document processing failed. Check backend logs and Bedrock model access.') from exc
