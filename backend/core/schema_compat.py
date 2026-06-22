from sqlalchemy import text

from backend.core.database import engine


def ensure_schema_compatibility() -> None:
    with engine.begin() as conn:
        # Migración: si la columna usuario.rol todavía existe, poblar rol + usuario_rol
        conn.execute(
            text(
                """
                DO $$
                DECLARE
                    pk_name TEXT;
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'rol' AND column_name = 'id'
                    ) THEN
                        ALTER TABLE rol ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);
                        UPDATE rol SET codigo = nombre WHERE codigo IS NULL OR trim(codigo) = '';
                        ALTER TABLE rol ALTER COLUMN codigo SET NOT NULL;

                        SELECT tc.constraint_name INTO pk_name
                        FROM information_schema.table_constraints tc
                        WHERE tc.table_name = 'rol' AND tc.constraint_type = 'PRIMARY KEY'
                        LIMIT 1;
                        IF pk_name IS NOT NULL THEN
                            EXECUTE format('ALTER TABLE rol DROP CONSTRAINT IF EXISTS %I CASCADE', pk_name);
                        END IF;

                        ALTER TABLE rol ADD CONSTRAINT rol_pkey PRIMARY KEY (codigo);
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints
                            WHERE table_name = 'rol' AND constraint_name = 'uq_rol_nombre'
                        ) THEN
                            ALTER TABLE rol ADD CONSTRAINT uq_rol_nombre UNIQUE (nombre);
                        END IF;
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'usuario_rol' AND column_name = 'rol_id'
                    ) THEN
                        ALTER TABLE usuario_rol ADD COLUMN IF NOT EXISTS rol_codigo VARCHAR(20);
                        UPDATE usuario_rol ur
                        SET rol_codigo = r.codigo
                        FROM rol r
                        WHERE ur.rol_id = r.id
                          AND (ur.rol_codigo IS NULL OR trim(ur.rol_codigo) = '');

                        SELECT tc.constraint_name INTO pk_name
                        FROM information_schema.table_constraints tc
                        WHERE tc.table_name = 'usuario_rol' AND tc.constraint_type = 'PRIMARY KEY'
                        LIMIT 1;
                        IF pk_name IS NOT NULL THEN
                            EXECUTE format('ALTER TABLE usuario_rol DROP CONSTRAINT IF EXISTS %I CASCADE', pk_name);
                        END IF;

                        ALTER TABLE usuario_rol ALTER COLUMN rol_id DROP NOT NULL;
                        ALTER TABLE usuario_rol ALTER COLUMN rol_codigo SET NOT NULL;
                        ALTER TABLE usuario_rol
                            ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (usuario_id, rol_codigo);
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'usuario' AND column_name = 'rol'
                    ) THEN
                        INSERT INTO rol (codigo, nombre, descripcion)
                        VALUES
                            ('ADMIN',   'Administrador', 'Administrador del sistema'),
                            ('STOCK',   'Gestor de stock', 'Gestor de inventario y stock'),
                            ('PEDIDOS', 'Gestor de pedidos', 'Gestor de pedidos'),
                            ('CLIENT',  'Cliente', 'Cliente registrado')
                        ON CONFLICT (codigo) DO NOTHING;

                        INSERT INTO usuario_rol (usuario_id, rol_codigo)
                        SELECT u.id, r.codigo
                        FROM usuario u
                        JOIN rol r ON r.codigo = u.rol
                        WHERE u.deleted_at IS NULL
                        ON CONFLICT DO NOTHING;
                    END IF;
                END $$;
                """
            )
        )

        conn.execute(
            text(
                """
                ALTER TABLE ingrediente
                ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidad'
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE usuario
                ADD COLUMN IF NOT EXISTS apellido VARCHAR(80)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE usuario
                ADD COLUMN IF NOT EXISTS celular VARCHAR(20)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE usuario_rol
                ADD COLUMN IF NOT EXISTS asignado_por_id INTEGER REFERENCES usuario(id)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE usuario_rol
                ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE usuario_rol
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS unidad_medida (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(50) NOT NULL UNIQUE,
                    simbolo VARCHAR(10) NOT NULL UNIQUE,
                    tipo VARCHAR(20) NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO unidad_medida (nombre, simbolo, tipo)
                VALUES
                    ('Kilogramo', 'kg', 'peso'),
                    ('Gramo', 'g', 'peso'),
                    ('Litro', 'L', 'volumen'),
                    ('Mililitro', 'ml', 'volumen'),
                    ('Unidad', 'ud', 'contable'),
                    ('Porciones', 'porciones', 'contable')
                ON CONFLICT (simbolo) DO NOTHING
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE ingrediente
                ADD COLUMN IF NOT EXISTS unidad_medida_id INTEGER REFERENCES unidad_medida(id)
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente i
                SET unidad_medida_id = um.id
                FROM unidad_medida um
                WHERE i.unidad_medida_id IS NULL
                  AND (
                    lower(um.simbolo) = CASE
                        WHEN lower(i.unidad_medida) IN ('kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos') THEN 'kg'
                        WHEN lower(i.unidad_medida) IN ('g', 'gr', 'gramo', 'gramos') THEN 'g'
                        WHEN lower(i.unidad_medida) IN ('l', 'lt', 'litro', 'litros') THEN 'l'
                        WHEN lower(i.unidad_medida) IN ('ml', 'mililitro', 'mililitros') THEN 'ml'
                        WHEN lower(i.unidad_medida) IN ('porc', 'porcion', 'porción', 'porciones') THEN 'porciones'
                        ELSE 'ud'
                    END
                  )
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente i
                SET unidad_medida_id = um.id
                FROM unidad_medida um
                WHERE i.unidad_medida_id IS NULL
                  AND um.simbolo = 'ud'
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE ingrediente
                ALTER COLUMN unidad_medida_id SET NOT NULL
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE ingrediente
                ADD COLUMN IF NOT EXISTS stock_cantidad INTEGER NOT NULL DEFAULT 0
                """
            )
        )
        conn.execute(text("ALTER TABLE ingrediente ALTER COLUMN stock_cantidad TYPE INTEGER USING round(stock_cantidad)::INTEGER"))
        conn.execute(
            text(
                """
                ALTER TABLE producto
                ADD COLUMN IF NOT EXISTS imagenes_url JSON NOT NULL DEFAULT '[]'::json
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE producto
                ADD COLUMN IF NOT EXISTS unidad_venta_id INTEGER REFERENCES unidad_medida(id)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE producto_ingrediente
                ADD COLUMN IF NOT EXISTS cantidad NUMERIC(10,3) NOT NULL DEFAULT 1
                """
            )
        )
        conn.execute(text("ALTER TABLE producto_ingrediente ALTER COLUMN cantidad TYPE NUMERIC(10,3) USING cantidad::NUMERIC(10,3)"))
        conn.execute(
            text(
                """
                ALTER TABLE producto_ingrediente
                ADD COLUMN IF NOT EXISTS unidad_medida_id INTEGER REFERENCES unidad_medida(id)
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE producto_ingrediente pi
                SET unidad_medida_id = i.unidad_medida_id
                FROM ingrediente i
                WHERE pi.ingrediente_id = i.id
                  AND pi.unidad_medida_id IS NULL
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE producto_ingrediente pi
                SET unidad_medida_id = um.id
                FROM unidad_medida um
                WHERE pi.unidad_medida_id IS NULL
                  AND um.simbolo = 'ud'
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE producto_ingrediente
                ALTER COLUMN unidad_medida_id SET NOT NULL
                """
            )
        )
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_name = 'producto_ingrediente_cantidad'
                    ) THEN
                        UPDATE producto_ingrediente pi
                        SET cantidad = pic.cantidad,
                            unidad_medida_id = COALESCE(pic.unidad_medida_id, pi.unidad_medida_id)
                        FROM producto_ingrediente_cantidad pic
                        WHERE pi.producto_id = pic.producto_id
                          AND pi.ingrediente_id = pic.ingrediente_id;
                    END IF;
                END $$;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS pago (
                    id SERIAL PRIMARY KEY,
                    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
                    mp_payment_id BIGINT UNIQUE,
                    mp_status VARCHAR(30) NOT NULL DEFAULT 'pending',
                    mp_status_detail VARCHAR(100),
                    transaction_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                    payment_method_id VARCHAR(50),
                    external_reference VARCHAR(100) NOT NULL UNIQUE,
                    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pago_pedido_id ON pago (pedido_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pago_external_reference ON pago (external_reference)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pago_idempotency_key ON pago (idempotency_key)"))
        conn.execute(text("ALTER TABLE pago ALTER COLUMN mp_payment_id TYPE BIGINT"))
        conn.execute(
            text(
                """
                UPDATE pedido
                SET estado_codigo = 'EN_PREP'
                WHERE estado_codigo = 'EN_CAMINO'
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE historial_estado_pedido
                SET estado_desde = 'EN_PREP'
                WHERE estado_desde = 'EN_CAMINO'
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM historial_estado_pedido
                WHERE estado_hacia = 'EN_CAMINO'
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM historial_estado_pedido h
                USING historial_estado_pedido dup
                WHERE h.id > dup.id
                  AND h.pedido_id = dup.pedido_id
                  AND COALESCE(h.estado_desde, '') = COALESCE(dup.estado_desde, '')
                  AND h.estado_hacia = dup.estado_hacia
                """
            )
        )
        conn.execute(text("DELETE FROM estado_pedido WHERE codigo = 'EN_CAMINO'"))
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET unidad_medida = 'gr'
                WHERE lower(unidad_medida) IN ('g', 'gr', 'gramo', 'gramos', 'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos')
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET unidad_medida = 'litros'
                WHERE lower(unidad_medida) IN ('l', 'lt', 'litro', 'litros', 'ml', 'mililitro', 'mililitros')
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET unidad_medida = 'unidad'
                WHERE lower(unidad_medida) IN ('u', 'un', 'unidad', 'unidades', 'pieza', 'piezas')
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET unidad_medida = 'unidad'
                WHERE lower(nombre) IN (
                    'pan de hamburguesa',
                    'masa de pizza',
                    'masa de empanada',
                    'huevo',
                    'masa de tarta',
                    'limon',
                    'lim\u00f3n'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET unidad_medida = 'gr'
                WHERE unidad_medida IS NULL OR trim(unidad_medida) = ''
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE ingrediente
                SET stock_cantidad = CASE
                    WHEN lower(nombre) = 'agua' THEN 50
                    WHEN lower(nombre) = 'leche' THEN 120
                    WHEN lower(nombre) = 'harina de trigo' THEN 20000
                    WHEN lower(nombre) = 'azucar' THEN 8000
                    WHEN lower(nombre) = 'cafe' THEN 5000
                    ELSE 100
                END
                WHERE stock_cantidad = 0
                """
            )
        )
