import os
import zipfile
import shutil
import xml.etree.ElementTree as ET
from django.conf import settings
from django.utils import timezone
from .models import Course, ScormPackage

def parse_imsmanifest(manifest_path):
    """
    Parses an imsmanifest.xml file to extract SCORM version, title, launch file,
    mastery score, and SCO items hierarchy.
    """
    if not os.path.exists(manifest_path):
        raise ValueError("imsmanifest.xml not found in the package root.")

    try:
        tree = ET.parse(manifest_path)
        root = tree.getroot()
    except Exception as e:
        raise ValueError(f"Failed to parse imsmanifest.xml XML: {str(e)}")

    # Remove XML namespaces for easier XPath querying
    for elem in root.iter():
        if '}' in elem.tag:
            elem.tag = elem.tag.split('}', 1)[1]

    # 1. Determine SCORM Version
    schema_version_elem = root.find('.//schemaversion')
    schema_version = schema_version_elem.text.strip() if schema_version_elem is not None and schema_version_elem.text else ''
    
    version = '1.2'
    if '2004' in schema_version or 'CAM 1.3' in schema_version:
        version = '2004'
    elif '1.2' in schema_version:
        version = '1.2'
    else:
        # Fallback inspection of root attributes
        root_str = ET.tostring(root, encoding='utf-8').decode('utf-8')
        if '2004' in root_str:
            version = '2004'

    # 2. Extract Course Title
    title_elem = root.find('.//organization/title') or root.find('.//title')
    title = title_elem.text.strip() if title_elem is not None and title_elem.text else ''

    # 3. Extract Mastery Score / Passing Score
    mastery_score = None
    mastery_elem = root.find('.//masteryscore') or root.find('.//minNormalizedMeasure')
    if mastery_elem is not None and mastery_elem.text:
        try:
            val = float(mastery_elem.text.strip())
            mastery_score = val * 100 if val <= 1.0 else val
        except ValueError:
            pass

    # 4. Extract Resources & Launch File (SCO)
    resources = {}
    default_launch = None
    for res in root.findall('.//resource'):
        identifier = res.get('identifier')
        href = res.get('href')
        type_attr = res.get('type', '')
        scorm_type = res.get('scormtype', res.get('scormType', '')).lower()

        if identifier and href:
            resources[identifier] = {
                'href': href,
                'type': type_attr,
                'scorm_type': scorm_type
            }
            if not default_launch and (scorm_type == 'sco' or 'html' in href.lower()):
                default_launch = href

    # 5. Extract SCO Items Tree
    sco_items = []
    for item in root.findall('.//item'):
        item_id = item.get('identifier')
        ref = item.get('identifierref')
        item_title_elem = item.find('title')
        item_title = item_title_elem.text.strip() if item_title_elem is not None and item_title_elem.text else ''
        
        launch_href = resources.get(ref, {}).get('href', '') if ref else ''
        if launch_href and not default_launch:
            default_launch = launch_href

        sco_items.append({
            'identifier': item_id,
            'title': item_title,
            'launch_href': launch_href
        })

    # If launch file was not explicitly found in items/resources, check common default filenames
    if not default_launch and resources:
        first_res = list(resources.values())[0]
        default_launch = first_res['href']

    with open(manifest_path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_manifest_xml = f.read()

    return {
        'version': version,
        'schema_version': schema_version or version,
        'title': title,
        'mastery_score': mastery_score,
        'launch_file': default_launch,
        'sco_items': sco_items,
        'raw_manifest_xml': raw_manifest_xml,
    }


def process_scorm_package(course: Course, uploaded_zip_file, user):
    """
    Extracts uploaded SCORM zip package, validates imsmanifest.xml,
    creates/updates ScormPackage record, and configures course launch URL.
    """
    org = course.organization or user.organization
    org_id = org.id if org else 'global'
    
    # Define extraction directory inside MEDIA_ROOT/scorm/<org_id>/<course_id>/
    rel_extract_path = f"scorm/{org_id}/{course.id}"
    full_extract_dir = os.path.join(settings.MEDIA_ROOT, rel_extract_path)

    # Clean old extraction directory if exists
    if os.path.exists(full_extract_dir):
        shutil.rmtree(full_extract_dir)

    os.makedirs(full_extract_dir, exist_ok=True)

    # Save and extract zip file
    zip_path = os.path.join(full_extract_dir, "package.zip")
    with open(zip_path, 'wb+') as destination:
        for chunk in uploaded_zip_file.chunks():
            destination.write(chunk)

    if not zipfile.is_zipfile(zip_path):
        shutil.rmtree(full_extract_dir)
        raise ValueError("Uploaded file is not a valid ZIP package.")

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(full_extract_dir)
    except Exception as e:
        shutil.rmtree(full_extract_dir)
        raise ValueError(f"Failed to extract ZIP package: {str(e)}")

    # Remove temporary zip file after extraction
    if os.path.exists(zip_path):
        os.remove(zip_path)

    # Locate imsmanifest.xml (Check root first, then nested subdirectories)
    manifest_path = os.path.join(full_extract_dir, "imsmanifest.xml")
    if not os.path.exists(manifest_path):
        # Search inside nested single directory if zipped with wrapper folder
        nested_dirs = [d for d in os.listdir(full_extract_dir) if os.path.isdir(os.path.join(full_extract_dir, d))]
        if len(nested_dirs) == 1:
            nested_manifest = os.path.join(full_extract_dir, nested_dirs[0], "imsmanifest.xml")
            if os.path.exists(nested_manifest):
                # Move contents up to full_extract_dir
                nested_path = os.path.join(full_extract_dir, nested_dirs[0])
                for f in os.listdir(nested_path):
                    shutil.move(os.path.join(nested_path, f), full_extract_dir)
                os.rmdir(nested_path)

    manifest_path = os.path.join(full_extract_dir, "imsmanifest.xml")
    if not os.path.exists(manifest_path):
        shutil.rmtree(full_extract_dir)
        raise ValueError("Invalid SCORM Package: imsmanifest.xml is missing from the package root.")

    # Parse imsmanifest.xml
    manifest_data = parse_imsmanifest(manifest_path)

    launch_file = manifest_data.get('launch_file')
    if not launch_file:
        # Fallback check for common html files
        for candidate in ['index_lms.html', 'story.html', 'index.html', 'scormdriver/indexAPI.html']:
            if os.path.exists(os.path.join(full_extract_dir, candidate)):
                launch_file = candidate
                break

    if not launch_file or not os.path.exists(os.path.join(full_extract_dir, launch_file)):
        shutil.rmtree(full_extract_dir)
        raise ValueError(f"Launch file '{launch_file or 'index.html'}' specified in manifest was not found in extracted package.")

    # Build relative launch URL to serve via Django MEDIA_URL
    relative_launch_url = f"{settings.MEDIA_URL.rstrip('/')}/{rel_extract_path}/{launch_file}"

    # Update Course
    course.is_scorm = True
    if manifest_data.get('title') and not course.title:
        course.title = manifest_data['title']
    if manifest_data.get('mastery_score'):
        course.passing_score = int(manifest_data['mastery_score'])
    course.save()

    # Create or update ScormPackage
    scorm_package, created = ScormPackage.objects.get_or_create(
        course=course,
        defaults={
            'organization': org,
            'extracted_dir': full_extract_dir,
            'manifest_id': manifest_data.get('title', ''),
            'title': manifest_data.get('title') or course.title,
            'version': manifest_data.get('version', '1.2'),
            'schema_version': manifest_data.get('schema_version', '1.2'),
            'launch_url': relative_launch_url,
            'mastery_score': manifest_data.get('mastery_score'),
            'raw_manifest_xml': manifest_data.get('raw_manifest_xml', ''),
            'sco_structure': manifest_data.get('sco_items', []),
        }
    )

    if not created:
        scorm_package.extracted_dir = full_extract_dir
        scorm_package.title = manifest_data.get('title') or course.title
        scorm_package.version = manifest_data.get('version', '1.2')
        scorm_package.schema_version = manifest_data.get('schema_version', '1.2')
        scorm_package.launch_url = relative_launch_url
        scorm_package.mastery_score = manifest_data.get('mastery_score')
        scorm_package.raw_manifest_xml = manifest_data.get('raw_manifest_xml', '')
        scorm_package.sco_structure = manifest_data.get('sco_items', [])
        scorm_package.uploaded_at = timezone.now()
        scorm_package.save()

    return scorm_package
