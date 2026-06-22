from decimal import Decimal

from backend.core.links import ProductoCategoriaLink, ProductoIngredienteLink
from backend.modules.categorias.models import Categoria
from backend.modules.ingredientes.models import Ingrediente
from backend.modules.productos.models import Producto


_categoria_counter = 0


def _login_admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert response.status_code == 200


def _create_categoria(db_session, nombre="Comidas"):
    global _categoria_counter
    _categoria_counter += 1
    categoria = Categoria(nombre=f"{nombre} test {_categoria_counter}")
    db_session.add(categoria)
    db_session.flush()
    return categoria


def _create_ingrediente(db_session, nombre, stock, unidad_medida_id=5):
    ingrediente = Ingrediente(
        nombre=nombre,
        unidad_medida_id=unidad_medida_id,
        stock_cantidad=stock,
    )
    db_session.add(ingrediente)
    db_session.flush()
    return ingrediente


def _create_producto(db_session, nombre="Producto test", stock_manual=0, disponible=True):
    producto = Producto(
        nombre=nombre,
        precio_base=Decimal("100.00"),
        stock_cantidad=stock_manual,
        disponible=disponible,
    )
    db_session.add(producto)
    db_session.flush()
    return producto


def _assign_categoria(db_session, producto, categoria):
    db_session.add(ProductoCategoriaLink(producto_id=producto.id, categoria_id=categoria.id, es_principal=True))
    db_session.flush()


def _assign_ingrediente(db_session, producto, ingrediente, cantidad):
    db_session.add(
        ProductoIngredienteLink(
            producto_id=producto.id,
            ingrediente_id=ingrediente.id,
            cantidad=Decimal(str(cantidad)),
            unidad_medida_id=ingrediente.unidad_medida_id,
        )
    )
    db_session.flush()


def test_list_and_detail_expose_stock_from_limiting_ingredient(client, db_session):
    categoria = _create_categoria(db_session)
    producto = _create_producto(db_session, stock_manual=99)
    ingrediente_a = _create_ingrediente(db_session, "Ingrediente A", stock=5)
    ingrediente_b = _create_ingrediente(db_session, "Ingrediente B", stock=10)
    _assign_categoria(db_session, producto, categoria)
    _assign_ingrediente(db_session, producto, ingrediente_a, "2")
    _assign_ingrediente(db_session, producto, ingrediente_b, "1")
    producto_id = producto.id
    db_session.commit()

    list_response = client.get("/api/v1/productos", params={"search": producto.nombre})
    detail_response = client.get(f"/api/v1/productos/{producto_id}")

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["stock_cantidad"] == 2
    assert detail_response.status_code == 200
    assert detail_response.json()["stock_cantidad"] == 2


def test_decimal_recipe_and_zero_ingredient_stock_calculate_complete_units(client, db_session):
    categoria = _create_categoria(db_session)
    decimal_product = _create_producto(db_session, nombre="Producto decimal", stock_manual=99)
    zero_product = _create_producto(db_session, nombre="Producto sin stock ingrediente", stock_manual=99)
    ingrediente_decimal = _create_ingrediente(db_session, "Ingrediente decimal", stock=5)
    ingrediente_cero = _create_ingrediente(db_session, "Ingrediente cero", stock=0)
    _assign_categoria(db_session, decimal_product, categoria)
    _assign_categoria(db_session, zero_product, categoria)
    _assign_ingrediente(db_session, decimal_product, ingrediente_decimal, "1.500")
    _assign_ingrediente(db_session, zero_product, ingrediente_cero, "1")
    decimal_product_id = decimal_product.id
    zero_product_id = zero_product.id
    db_session.commit()

    decimal_response = client.get(f"/api/v1/productos/{decimal_product_id}")
    zero_response = client.get(f"/api/v1/productos/{zero_product_id}")

    assert decimal_response.status_code == 200
    assert decimal_response.json()["stock_cantidad"] == 3
    assert zero_response.status_code == 200
    assert zero_response.json()["stock_cantidad"] == 0


def test_product_without_recipe_reports_stock_zero(client, db_session):
    categoria = _create_categoria(db_session)
    producto = _create_producto(db_session, stock_manual=99)
    _assign_categoria(db_session, producto, categoria)
    db_session.commit()

    response = client.get(f"/api/v1/productos/{producto.id}")

    assert response.status_code == 200
    assert response.json()["stock_cantidad"] == 0


def test_simple_product_one_to_one_uses_equivalent_ingredient_stock(client, db_session):
    categoria = _create_categoria(db_session, nombre="Bebidas")
    producto = _create_producto(db_session, nombre="Coca Cola", stock_manual=0)
    ingrediente = _create_ingrediente(db_session, "Coca Cola", stock=8)
    _assign_categoria(db_session, producto, categoria)
    _assign_ingrediente(db_session, producto, ingrediente, "1")
    db_session.commit()

    response = client.get(f"/api/v1/productos/{producto.id}")

    assert response.status_code == 200
    assert response.json()["stock_cantidad"] == 8


def test_create_and_update_ignore_legacy_stock_input(client, db_session):
    _login_admin(client)
    categoria = _create_categoria(db_session)
    ingrediente = _create_ingrediente(db_session, "Ingrediente API", stock=6)
    db_session.commit()

    create_response = client.post(
        "/api/v1/productos",
        json={
            "nombre": "Producto API",
            "precio_base": "120.00",
            "stock_cantidad": 99,
            "categorias": [{"categoria_id": categoria.id, "es_principal": True}],
            "ingredientes": [
                {"ingrediente_id": ingrediente.id, "cantidad": "2", "unidad_medida_id": ingrediente.unidad_medida_id}
            ],
        },
    )
    assert create_response.status_code == 201
    producto_id = create_response.json()["id"]
    assert create_response.json()["stock_cantidad"] == 3

    update_response = client.patch(f"/api/v1/productos/{producto_id}", json={"stock_cantidad": 99})
    detail_response = client.get(f"/api/v1/productos/{producto_id}")

    assert update_response.status_code == 200
    assert update_response.json()["stock_cantidad"] == 3
    assert detail_response.status_code == 200
    assert detail_response.json()["stock_cantidad"] == 3


def test_deprecated_stock_patch_is_noop_returning_calculated_stock(client, db_session):
    _login_admin(client)
    categoria = _create_categoria(db_session)
    producto = _create_producto(db_session, stock_manual=0)
    ingrediente = _create_ingrediente(db_session, "Ingrediente patch", stock=4)
    _assign_categoria(db_session, producto, categoria)
    _assign_ingrediente(db_session, producto, ingrediente, "2")
    producto_id = producto.id
    db_session.commit()

    response = client.patch(f"/api/v1/productos/{producto_id}/stock", json={"stock_cantidad": 99})
    detail_response = client.get(f"/api/v1/productos/{producto_id}")

    assert response.status_code == 200
    assert response.json()["stock_cantidad"] == 2
    assert detail_response.status_code == 200
    assert detail_response.json()["stock_cantidad"] == 2
