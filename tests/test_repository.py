import os
import pytest
from app.repository import Repository

@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL'), reason='Set TEST_DATABASE_URL to isolated PostgreSQL')
def test_seed_has_twelve_seats(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, 'database_url', os.environ['TEST_DATABASE_URL'])
    assert len(Repository().list_seats('SHOW-001')) >= 12
