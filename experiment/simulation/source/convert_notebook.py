import json
import base64
from pathlib import Path

# Paths
NOTEBOOK_PATH = Path("/home/onkar/.jackt/sha/vlab/final_nb/nb_sequential copy.ipynb")
OUTPUT_PATH = Path("notebook_data.json")

def extract_data(notebook_path: Path):
    if not notebook_path.exists():
        print(f"Error: Notebook not found at {notebook_path}")
        return

    with open(notebook_path, 'r', encoding='utf-8') as f:
        nb_content = json.load(f)

    extracted_cells = []
    
    for idx, cell in enumerate(nb_content.get('cells', [])):
        cell_data = {
            'id': idx,
            'cell_type': cell.get('cell_type'),
            'source': ''.join(cell.get('source', [])),
            'outputs': []
        }

        if cell.get('cell_type') == 'code':
            for output in cell.get('outputs', []):
                output_data = {'output_type': output.get('output_type')}
                
                if output.get('output_type') == 'stream':
                    output_data['text'] = ''.join(output.get('text', []))
                    output_data['name'] = output.get('name') # stdout/stderr
                    
                elif output.get('output_type') in ['display_data', 'execute_result']:
                    data = output.get('data', {})
                    if 'image/png' in data:
                        output_data['data'] = {
                            'image/png': data['image/png']
                        }
                    elif 'text/plain' in data:
                        output_data['data'] = {
                            'text/plain': ''.join(data['text/plain'])
                        }
                
                cell_data['outputs'].append(output_data)
        
        extracted_cells.append(cell_data)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(extracted_cells, f, indent=2)
    
    print(f"BEEP BOOP! Extracted {len(extracted_cells)} cells to {OUTPUT_PATH.resolve()}")

if __name__ == "__main__":
    extract_data(NOTEBOOK_PATH)
