import re

def main():
    file_path = "/home/hjcxd/Onedrive/Documentos/Obsidian/HJCXD/UTN/TecProgramacion/S4/P4_backend/TPI_F/p4intg/backend/seeds/seed_data.py"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    vars_to_remove = [
        "prod_hambu_pollo", "prod_hambu_veggie", "prod_hambu_americana", "prod_hambu_criolla",
        "prod_pizza_calabresa", "prod_pizza_4q", "prod_pizza_jym", "prod_pizza_especial",
        "prod_flan",
        "prod_cola_15", "prod_cola_225", "prod_sprite_15", "prod_fanta_15"
    ]

    # Remove the get_or_create_producto definitions
    for var in vars_to_remove:
        # Match single-line: var = get_or_create_producto(...)
        # Match multi-line: var = get_or_create_producto(\n ... \n)
        pattern = r"^[ \t]*" + re.escape(var) + r"\s*=\s*get_or_create_producto\([^)]+\)\n"
        content = re.sub(pattern, "", content, flags=re.MULTILINE)

    # Remove the variable from lists (like inside assign_demo_product_images or for loops)
    for var in vars_to_remove:
        pattern = r"^[ \t]*" + re.escape(var) + r",\n"
        content = re.sub(pattern, "", content, flags=re.MULTILINE)

    # Remove the ensure_producto_ingrediente(var.id, ...) lines
    for var in vars_to_remove:
        pattern = r"^[ \t]*ensure_producto_ingrediente\(" + re.escape(var) + r"\.id,.*?\)\n"
        content = re.sub(pattern, "", content, flags=re.MULTILINE)
        
    # Remove the ensure_producto_categoria(var.id, ...) lines (if they exist independently)
    for var in vars_to_remove:
        pattern = r"^[ \t]*ensure_producto_categoria\(" + re.escape(var) + r"\.id,.*?\)\n"
        content = re.sub(pattern, "", content, flags=re.MULTILINE)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
