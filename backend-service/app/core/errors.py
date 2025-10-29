from typing import Any, Dict, Optional
from datetime import datetime


class AppError(Exception):
    """应用统一错误类型"""

    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Any] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


def error_payload(code: str, message: str, details: Optional[Any] = None) -> Dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            **({"details": details} if details is not None else {})
        },
        "meta": {"timestamp": datetime.now().isoformat()},
    }

