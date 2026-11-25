import os, sys, runpy
from pathlib import Path
# NTFS alternate streams preserve the helper's metadata on Windows.
def set_attr(path, name, value, *args):
    target = str(path) + ':' + name
    if args and Path(target).exists():
        import errno
        raise OSError(errno.EEXIST, 'Attribute exists')
    with open(target, 'wb') as f: f.write(value)
def get_attr(path, name):
    with open(str(path) + ':' + name, 'rb') as f: return f.read()
os.setxattr = set_attr
os.getxattr = get_attr
os.XATTR_CREATE = 1
helper = Path(__file__).parent / 'transfer-helper' / 'library_file_transfer.py'
sys.path.insert(0, str(helper.parent))
sys.argv = [str(helper), *sys.argv[1:]]
runpy.run_path(str(helper), run_name='__main__')
