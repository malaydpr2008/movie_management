import uuid

class NarrativeDomainError(Exception):
    """Base exception for all narrative domain errors."""
    pass

class SceneNotFoundError(NarrativeDomainError):
    """Raised when a scene with the specified ID does not exist."""
    def __init__(self, scene_id: uuid.UUID):
        super().__init__(f"Scene with ID '{scene_id}' does not exist.")
        self.scene_id = scene_id

class SequenceNotFoundError(NarrativeDomainError):
    """Raised when a referenced sequence does not exist."""
    def __init__(self, sequence_id: uuid.UUID):
        super().__init__(f"Sequence with ID '{sequence_id}' does not exist.")
        self.sequence_id = sequence_id

class InvalidSceneDataError(NarrativeDomainError):
    """Raised when scene data violates domain invariants."""
    pass
