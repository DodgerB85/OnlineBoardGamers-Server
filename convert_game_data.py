import base64
import json
import gzip

# Try to import the new libraries - will fail if not available
try:
    import msgpack
    import pako
    NEW_LIBRARIES_AVAILABLE = True
except ImportError:
    NEW_LIBRARIES_AVAILABLE = False
    print("Warning: msgpack/pako libraries not available, using old format only")

def convert_game_data(base64data):
    """
    Convert game data from old or new format to standardized format.
    
    Args:
        base64data: Base64 encoded string (either old JSON or new compressed format)
    
    Returns:
        dict: Converted game data
    """
    try:
        # Try new method first (if libraries available)
        if NEW_LIBRARIES_AVAILABLE:
            # 1. Base64 to binary
            binary_data = base64.b64decode(base64data)
            
            # 2. Try to decompress with pako (gzip)
            try:
                decompressed = gzip.decompress(binary_data)
            except:
                # If gzip fails, try without compression
                decompressed = binary_data
            
            # 3. Try to decode with msgpack
            try:
                data = msgpack.unpackb(decompressed, raw=False)
                print("Successfully converted using new method (msgpack + compression)")
                return data
            except:
                print("MsgPack decode failed, trying JSON decode...")
                # Fallback to JSON if msgpack fails
                try:
                    data = json.loads(decompressed.decode('utf-8'))
                    print("Successfully converted using new method (JSON + compression)")
                    return data
                except:
                    print("JSON decode also failed")
        
        # Fallback to old method
        print("Trying old method (JSON without compression)...")
        # 1. Base64 decode
        binary_data = base64.b64decode(base64data)
        # 2. Convert to string and parse JSON
        json_str = binary_data.decode('utf-8')
        data = json.loads(json_str)
        print("Successfully converted using old method (JSON only)")
        return data
        
    except Exception as e:
        print(f"Error converting data: {e}")
        print("Data might be corrupted or in unexpected format")
        return None

def restructure_to_new_format(old_data):
    """
    Restructure old format data to new format.
    
    Args:
        old_data: dict - Data in old format structure
    
    Returns:
        dict: Data in new format structure
    """
    new_data = []
    
    # 0 - players (keep as is, will be msgpack encoded later)
    new_data.append(old_data[0])
    
    # 1 - junctions (compress full array)
    if len(old_data) > 1:
        compressed_junctions = compress_junctions(old_data[1])
        new_data.append(compressed_junctions)
    else:
        new_data.append([])
    
    # 2 - lines (compress full array)
    if len(old_data) > 2:
        compressed_lines = compress_lines(old_data[2])
        new_data.append(compressed_lines)
    else:
        new_data.append([])
    
    # 3 - actionAreaData (compress full array)
    if len(old_data) > 3:
        compressed_action_area = compress_action_area(old_data[3])
        new_data.append(compressed_action_area)
    else:
        new_data.append([])
    
    # 4 - history (keep as is, already JSON string)
    if len(old_data) > 4:
        new_data.append(old_data[4])
    else:
        new_data.append([])
    
    # 5 - desiredBuilding
    if len(old_data) > 5:
        new_data.append(old_data[5])
    else:
        new_data.append(0)
    
    # 6 - gameflow (only if not game over)
    # Old format didn't have gameflow in this array, so skip
    new_data.append([])
    
    # 7 - context (keep as is, already JSON string)
    if len(old_data) > 7:
        new_data.append(old_data[7])
    else:
        new_data.append({})
    
    return new_data

def compress_junctions(junctions_array):
    """Compress junctions array by filtering out -1 values"""
    compressed = []
    for row in junctions_array:
        for cell in row:
            if cell != -1:
                compressed.append(cell)
    return compressed

def compress_lines(lines_array):
    """Compress lines array into player-indexed format"""
    compressed = {}
    for line_index, line_array in enumerate(lines_array):
        # If array has a player index inside it
        if len(line_array) > 0:
            player_index = line_array[0]

            # Initialize player's array if it doesn't exist yet
            if player_index not in compressed:
                compressed[player_index] = []

            compressed[player_index].append(line_index)
    return compressed

def compress_action_area(action_area_array):
    """Compress action area by filtering out -1 values"""
    compressed = []
    for inner_array in action_area_array:
        filtered = [val for val in inner_array if val != -1]
        compressed.append(filtered)
    return compressed

def recompress_data(data):
    """
    Recompress data using new method.
    
    Args:
        data: dict - Game data to recompress (can be old or new format)
    
    Returns:
        str: Base64 encoded compressed data using new method
    """
    if not NEW_LIBRARIES_AVAILABLE:
        print("Cannot recompress - new libraries not available")
        return None
    
    try:
        # Check if data is in old format and restructure if needed
        if isinstance(data, list) and len(data) >= 4:
            print("Detected old format, restructuring...")
            data = restructure_to_new_format(data)
        
        # 1. Encode with msgpack
        packed = msgpack.packb(data)
        
        # 2. Compress with gzip
        compressed = gzip.compress(packed)
        
        # 3. Base64 encode
        result = base64.b64encode(compressed).decode('utf-8')
        print("Successfully recompressed using new method")
        return result
        
    except Exception as e:
        print(f"Error recompressing data: {e}")
        return None

# Example usage
if __name__ == "__main__":
    # Test with sample data in OLD format structure
    old_format_data = [
        # 0 - players (JSON string)
        '[{"name": "Player1", "score": 10}, {"name": "Player2", "score": 8}]',
        # 1 - junctions (full array)
        [[-1, -1, -1, -1, 0, 0], [-1, -1, -1, -1, 0, 0]],
        # 2 - lines (full array)
        [[], [], [], [], [], [], []],  # 80 empty line arrays
        # 3 - actionAreaData (full array)
        [[-1, -1, -1, -1, 0, 0], [-1, -1, -1, -1, 0, 0]],
        # 4 - history (JSON string)
        '[]',
        # 5 - desiredBuilding
        1,
        # 6 - context (JSON string)
        '{"test": "context"}'
    ]
    
    # Convert old format to base64 (simulating database storage)
    old_json = json.dumps(old_format_data)
    old_base64 = base64.b64encode(old_json.encode('utf-8')).decode('utf-8')
    
    print("Testing old format conversion:")
    result1 = convert_game_data(old_base64)
    print(f"Result type: {type(result1)}")
    if isinstance(result1, list):
        print(f"Array length: {len(result1)}")
        for i, item in enumerate(result1):
            print(f"  [{i}]: {type(item)} - {len(item) if hasattr(item, '__len__') else 'N/A'} items")
    
    print("\n" + "="*50)
    print("Testing restructuring and recompression:")
    if NEW_LIBRARIES_AVAILABLE:
        # Restructure and recompress
        restructured = restructure_to_new_format(result1)
        recompressed = recompress_data(restructured)
        print(f"Recompressed: {recompressed[:100]}...")  # Show first 100 chars
        
        # Test round-trip
        print("Testing round-trip conversion...")
        roundtrip = convert_game_data(recompressed)
        print(f"Round-trip successful: {roundtrip is not None}")
