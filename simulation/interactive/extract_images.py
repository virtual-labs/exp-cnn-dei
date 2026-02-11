
import re
import os
import base64

js_path = '/home/shabd/programming/python/dei_ml/vlab/exp-cnn-dei/experiment/simulation/interactive/js/image-loader.js'
data_dir = '/home/shabd/programming/python/dei_ml/vlab/exp-cnn-dei/experiment/simulation/interactive/data'

with open(js_path, 'r') as f:
    content = f.read()

# Regex to find keys and base64 data
# Matches: 'filename.png': 'data:image/png;base64,.....'
pattern = re.compile(r"'([^']+)'\s*:\s*'data:image/png;base64,([^']+)'")

matches = pattern.findall(content)

print(f"Found {len(matches)} images.")

if not os.path.exists(data_dir):
    os.makedirs(data_dir)

for filename, b64_data in matches:
    file_path = os.path.join(data_dir, filename)
    with open(file_path, 'wb') as f:
        f.write(base64.b64decode(b64_data))
    print(f"Saved {filename}")
