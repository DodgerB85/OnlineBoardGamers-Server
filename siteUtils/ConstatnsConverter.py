import re
from pathlib import Path

def sync_js_to_py(js_file_path, py_output_path):
    # Pattern for the variables inside the blocks
    const_pattern = re.compile(r'export\s+const\s+(\w+)\s*=\s*([^;/\n]+)')
    
    # Pattern to find all blocks between the markers
    block_pattern = re.compile(
        r'\/\/\s*EXTERNAL VARS(.*?)\/\/\s*END EXTERNAL VARS', 
        re.DOTALL
    )
    
    try:
        js_content = Path(js_file_path).read_text()
    except FileNotFoundError:
        print(f"❌ File not found: {js_file_path}")
        return

    all_py_lines = []
    blocks_found = 0

    # Find every block in the file
    for match in block_pattern.finditer(js_content):
        blocks_found += 1
        block_text = match.group(1)
        extracted_vars = const_pattern.findall(block_text)
        
        for name, val in extracted_vars:
            all_py_lines.append(f"{name.strip()} = {val.strip()}")

    if blocks_found == 0:
        print(f"⚠️  No 'EXTERNAL VARS' blocks found in {js_file_path}")
        return

    # Write the combined results
    header = f"# Generated from {js_file_path}\n# Total blocks synced: {blocks_found}\n"
    Path(py_output_path).write_text(header + "\n".join(all_py_lines) + "\n")
    
    print(f"✅ Synced {len(all_py_lines)} constants from {blocks_found} blocks to {py_output_path}")

# Example usage
files_to_sync = [
    ("./AQY/vueAQY/src/js/AQYreference.js", "./AQY/AQYconstants.py"),
]

if __name__ == "__main__":
    for js_in, py_out in files_to_sync:
        sync_js_to_py(js_in, py_out)
