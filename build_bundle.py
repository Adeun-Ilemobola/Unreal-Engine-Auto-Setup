from pathlib import Path
import json, zipfile, xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent
source = root / 'unreal-auto-setup'
p = json.loads((source/'package.json').read_text(encoding='utf-8'))
name = p['name']+'-'+p['version']+'.vsix'
manifest = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
<Metadata><Identity Language="en-US" Id="{p['name']}" Version="{p['version']}" Publisher="{p['publisher']}"/><DisplayName>{p['displayName']}</DisplayName><Description xml:space="preserve">{p['description']}</Description><Tags>unreal,workspace,formatting</Tags><Categories>Other,Extension Packs</Categories><GalleryFlags>Public</GalleryFlags><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.100.0"/><Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/><Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="{",".join(p.get('extensionPack', []))}"/><Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/><Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/><Property Id="Microsoft.VisualStudio.Code.EnabledApiProposals" Value=""/></Properties><License>extension/LICENSE</License></Metadata>
<Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/>
<Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/><Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/><Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true"/></Assets></PackageManifest>'''
content_types='''<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="svg" ContentType="image/svg+xml"/><Default Extension="md" ContentType="text/markdown"/><Default Extension="vsixmanifest" ContentType="text/xml"/><Default Extension="xml" ContentType="text/xml"/><Override PartName="/extension/LICENSE" ContentType="text/plain"/></Types>'''
with zipfile.ZipFile(root/name,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('extension.vsixmanifest',manifest)
    z.writestr('[Content_Types].xml',content_types)
    for filename in ['package.json','extension.js','core.js','runner.js','project.js','engine.js','diagnostics.js','processes.js','debugger.js','build.js','problemParser.js','runtime.js','generation.js','modules.js','classTemplates.js','classFiles.js','classWizard.js','descriptors.js','moduleTemplates.js','creation.js','structureWizard.js','buildCsParser.js','dependencyModel.js','dependencyEditor.js','dependencyIndex.js','dependencyDiagnostics.js','dependencyActions.js','dirtyTracker.js','runtimeCoordinator.js','liveCoding.js','runtimeWatcher.js','sidebar.js','explorerClass.js','media/unreal.svg','CAPABILITIES.md','VALIDATION.md','README.md','LICENSE']:
        z.write(source/filename, 'extension/'+filename)
with zipfile.ZipFile(root/name) as z:
    assert z.testzip() is None
    ET.fromstring(z.read('extension.vsixmanifest'))
    ET.fromstring(z.read('[Content_Types].xml'))
    assert json.loads(z.read('extension/package.json'))['main']=='./extension.js'
bundle=root/'Unreal-Engine-Auto-Setup.zip'
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as z:
    z.write(root/name,name)
    z.write(source/'README.md','README.md')
    z.write(root/'build_bundle.py','build_bundle.py')
    for file in sorted(source.rglob('*')):
        if file.is_file(): z.write(file,str(file.relative_to(root)))
print(bundle)
print('VSIX structure validated. Bundle bytes:',bundle.stat().st_size)
