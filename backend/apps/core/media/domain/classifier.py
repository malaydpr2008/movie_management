def classify_media_type(filename: str) -> str:
    """
    Pure domain function that classifies a media file type based on its filename extension.
    Returns: 'IMAGE', 'AUDIO', 'PDF', or 'OTHER'.
    """
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        return 'IMAGE'
    elif ext in ['mp3', 'wav', 'aac']:
        return 'AUDIO'
    elif ext == 'pdf':
        return 'PDF'
    return 'OTHER'
