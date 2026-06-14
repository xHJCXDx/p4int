from sqlalchemy import BigInteger, Integer, JSON, types
from sqlalchemy.dialects.postgresql import ARRAY


class PortableBigInt(types.TypeDecorator):
    """BigInteger on PostgreSQL, Integer on SQLite (so autoincrement works)."""

    impl = Integer
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(BigInteger())
        return dialect.type_descriptor(Integer())


class PortableArray(types.TypeDecorator):
    """ARRAY on PostgreSQL, JSON on SQLite — transparent to the rest of the code."""

    impl = JSON
    cache_ok = True

    def __init__(self, item_type):
        super().__init__()
        self.item_type = item_type

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(self.item_type))
        return dialect.type_descriptor(JSON())
