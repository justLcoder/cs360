$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$root='C:\dev\cs360\assignment-4'
$assets=Join-Path $root 'report-assets'
$content=Get-Content (Join-Path $assets 'content.json') -Raw | ConvertFrom-Json -AsHashtable
$source=Join-Path $assets 'template-original.docx'
$output=Join-Path $root 'UCD_completed.docx'
Copy-Item -LiteralPath $source -Destination $output -Force
$zip=[IO.Compression.ZipFile]::Open($output,[IO.Compression.ZipArchiveMode]::Update)
function ReadXml($entry) {
  $reader=[IO.StreamReader]::new($zip.GetEntry($entry).Open())
  try { $value=[xml]$reader.ReadToEnd(); return ,$value } finally { $reader.Dispose() }
}
$doc=ReadXml 'word/document.xml'
$rels=ReadXml 'word/_rels/document.xml.rels'
$types=ReadXml '[Content_Types].xml'
$w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$ns=[Xml.XmlNamespaceManager]::new($doc.NameTable)
$ns.AddNamespace('w',$w)
$body=$doc.SelectSingleNode('//w:body',$ns)
$nodes=@($body.ChildNodes)
function Element($name) { return $doc.CreateElement('w',$name,$w) }
function SetText($p,$text) {
  $ppr=$p.SelectSingleNode('w:pPr',$ns)
  foreach($child in @($p.ChildNodes)) { if($child -ne $ppr) { [void]$p.RemoveChild($child) } }
  $run=Element 'r'; $t=Element 't'
  [void]$t.SetAttribute('space','http://www.w3.org/XML/1998/namespace','preserve')
  $t.InnerText=$text; [void]$run.AppendChild($t); [void]$p.AppendChild($run)
}
function NewParagraph($text,$bold=$false,$breakBefore=$false) {
  $p=Element 'p'; $pr=Element 'pPr'
  $sp=Element 'spacing'; [void]$sp.SetAttribute('after',$w,'100'); [void]$pr.AppendChild($sp)
  if($breakBefore) { [void]$pr.AppendChild((Element 'pageBreakBefore')) }
  [void]$p.AppendChild($pr)
  SetText $p $text
  if($bold) { $rp=Element 'rPr'; [void]$rp.AppendChild((Element 'b')); [void]$p.LastChild.PrependChild($rp) }
  return ,$p
}
function InsertTexts($anchor,$texts) {
  foreach($text in $texts) { [void]$body.InsertBefore((NewParagraph $text),$anchor) }
  [void]$body.RemoveChild($anchor)
}
function PageBefore($p) {
  $pr=$p.SelectSingleNode('w:pPr',$ns)
  if(!$pr) { $pr=Element 'pPr'; [void]$p.PrependChild($pr) }
  if(!$pr.SelectSingleNode('w:pageBreakBefore',$ns)) { [void]$pr.AppendChild((Element 'pageBreakBefore')) }
}
$script:imageId=200
function AddImage($anchor,$file,$caption,$newPage=$true,$maxHeight=6.5) {
  $label=NewParagraph $caption $true $newPage
  [void]$body.InsertBefore($label,$anchor)
  $script:imageId++
  $id=$script:imageId
  $image=[Drawing.Image]::FromFile($file)
  $width=[math]::Min(5.8,$maxHeight*$image.Width/$image.Height)
  $height=$width*$image.Height/$image.Width
  $image.Dispose()
  $cx=[long]($width*914400); $cy=[long]($height*914400)
  $rid="rIdFlatSplit$id"
  $entry="word/media/flatsplit$id.jpg"
  [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file,$entry)
  $rel=$rels.CreateElement('Relationship',$rels.DocumentElement.NamespaceURI)
  [void]$rel.SetAttribute('Id',$rid); [void]$rel.SetAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'); [void]$rel.SetAttribute('Target',"media/flatsplit$id.jpg")
  [void]$rels.DocumentElement.AppendChild($rel)
  $p=Element 'p'
  $p.InnerXml=@"
<w:pPr xmlns:w="$w"><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
<w:r xmlns:w="$w"><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="$cx" cy="$cy"/><wp:docPr id="$id" name="FlatSplit $id" descr="$caption"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="$id" name="FlatSplit $id"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="$rid"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>
"@
  [void]$body.InsertBefore($p,$anchor)
}
# Fill existing response locations and retain the template's headings and tables.
foreach($key in $content.replacements.Keys) {
  $anchor=$nodes[[int]$key]
  $texts=$content.replacements[$key]
  if($texts.Count -eq 1) { SetText $anchor $texts[0] } else { InsertTexts $anchor $texts }
}
# Remove unused blank lines; preserve blank student ID field.
foreach($p in @($body.SelectNodes('w:p',$ns))) {
  $text=($p.SelectNodes('.//w:t',$ns) | ForEach-Object {$_.InnerText}) -join ''
  if([string]::IsNullOrWhiteSpace($text) -and !$p.SelectSingleNode('.//w:drawing',$ns)) { [void]$body.RemoveChild($p) }
}
foreach($index in @(18,27,35,39,48,58)) { PageBefore $nodes[$index] }
SetText $nodes[0] 'CS360 Assignment 4 FlatSplit user centered design'
# Use a black title while retaining the template's overall formatting.
$titlePr=$nodes[0].SelectSingleNode('w:pPr',$ns)
if($titlePr) {
  foreach($border in @($titlePr.SelectNodes('w:pBdr',$ns))) { [void]$titlePr.RemoveChild($border) }
}
# Put the actual photos into their original/revised sections.
foreach($photo in $content.originalPhotos) {
  AddImage $nodes[30] (Join-Path $assets ('photo_2026-10-31_'+$photo[0]+'.jpg')) $photo[1]
}
[void]$body.RemoveChild($nodes[30])
foreach($photo in $content.revisedPhotos) {
  AddImage $nodes[42] (Join-Path $assets ('photo_2026-10-31_'+$photo[0]+'.jpg')) $photo[1]
}
[void]$body.RemoveChild($nodes[42])
# Tables keep the existing header formatting; body cells use plain readable text.
function FillTable($table,$rows) {
  $existing=@($table.SelectNodes('w:tr',$ns))
  $template=$existing[1].CloneNode($true)
  for($i=1;$i -lt $existing.Count;$i++) { [void]$table.RemoveChild($existing[$i]) }
  foreach($values in $rows) {
    $row=$template.CloneNode($true)
    $cells=@($row.SelectNodes('w:tc',$ns))
    for($i=0;$i -lt $cells.Count;$i++) {
      foreach($p in @($cells[$i].SelectNodes('w:p',$ns))) { [void]$cells[$i].RemoveChild($p) }
      [void]$cells[$i].AppendChild((NewParagraph $values[$i]))
    }
    foreach($height in @($row.SelectNodes('w:trPr/w:trHeight',$ns))) { [void]$height.ParentNode.RemoveChild($height) }
    [void]$table.AppendChild($row)
  }
  $header=$table.SelectSingleNode('w:tr/w:trPr/w:tblHeader',$ns)
  if($header) { [void]$header.SetAttribute('val',$w,'1') }
}
[void]$body.InsertBefore((NewParagraph $content.validationSummary),$nodes[37])
FillTable $nodes[37] $content.validationRows
$feedbackAnchor=$nodes[39]
[void]$body.InsertBefore((NewParagraph 'Combined feedback' $true),$feedbackAnchor)
foreach($feedback in $content.feedback) { [void]$body.InsertBefore((NewParagraph $feedback),$feedbackAnchor) }
[void]$body.InsertBefore((NewParagraph 'The sketches were reviewed in a walkthrough. I did not record timings, click counts or separate task-completion results.'),$feedbackAnchor)
$changeTitle=NewParagraph 'Changes from version 1 to version 2' $true $true
[void]$body.InsertBefore($changeTitle,$nodes[45])
FillTable $nodes[45] $content.changeRows
[void]$body.InsertAfter((NewParagraph 'The paper sketches show the layout. The React prototype uses a complete milk, apples and rice example and calculates the amounts automatically.'),$nodes[45])
# Crop only the browser screenshots to the app column for readable report figures.
foreach($name in @('01-add-product','02-history','03-purchase-details','04-split-summary')) {
  $img=[Drawing.Bitmap]::new((Join-Path $root ('screenshots/'+$name+'.jpg')))
  $cropWidth=[math]::Min(560,$img.Width)
  $rect=[Drawing.Rectangle]::new([int](($img.Width-$cropWidth)/2),0,[int]$cropWidth,$img.Height)
  $crop=$img.Clone($rect,$img.PixelFormat)
  $file=Join-Path $assets ($name+'-report.jpg')
  $crop.Save($file,[Drawing.Imaging.ImageFormat]::Jpeg)
  $crop.Dispose(); $img.Dispose()
  $caption=switch($name) {
    '01-add-product' {'React Add product with quantity and unit'}
    '02-history' {'React History with buyer and roommate summaries'}
    '03-purchase-details' {'React Purchase details showing quantities'}
    '04-split-summary' {'React Split summary with Paid and Unpaid buttons'}
  }
  AddImage $nodes[51] $file $caption $true 7.0
}
[void]$body.RemoveChild($nodes[51])
# Ensure JPEGs have a content type.
if(!($types.DocumentElement.ChildNodes | Where-Object { $_.Extension -eq 'jpg' })) {
  $type=$types.CreateElement('Default',$types.DocumentElement.NamespaceURI)
  [void]$type.SetAttribute('Extension','jpg'); [void]$type.SetAttribute('ContentType','image/jpeg'); [void]$types.DocumentElement.AppendChild($type)
}
function WriteXml($name,$xml) {
  $zip.GetEntry($name).Delete()
  $entry=$zip.CreateEntry($name)
  $writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
  try { $xml.Save($writer) } finally { $writer.Dispose() }
}
WriteXml 'word/document.xml' $doc
WriteXml 'word/_rels/document.xml.rels' $rels
WriteXml '[Content_Types].xml' $types
$zip.Dispose()
Write-Output $output

