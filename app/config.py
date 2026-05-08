from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_NAME: str = "helpdesk_db"

    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    APP_NAME: str = "HelpDesk HUS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "*"

    UPLOAD_DIR: str = "app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = "pdf,png,jpg,jpeg,gif,webp,doc,docx,xls,xlsx,txt"

    DATABASE_URL_OVERRIDE: str = ""

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            url = self.DATABASE_URL_OVERRIDE
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            if url.startswith("mysql+pymysql://") and "charset" not in url:
                url += "?charset=utf8mb4"
            return url
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_extensions_set(self) -> set:
        return {ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")}

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()