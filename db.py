import psycopg2

from config import NEON_DATABASE_URL


def get_connection():
    if not NEON_DATABASE_URL or "USER:PASSWORD" in NEON_DATABASE_URL:
        raise RuntimeError(
            "NEON_DATABASE_URL .env dosyasında ayarlanmamış. "
            "Neon panelinden connection string'i kopyalayıp .env içine yapıştırın."
        )
    return psycopg2.connect(NEON_DATABASE_URL)


def test_connection():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        print("Neon bağlantısı başarılı:", result)
        return result
    finally:
        connection.close()


if __name__ == "__main__":
    test_connection()
