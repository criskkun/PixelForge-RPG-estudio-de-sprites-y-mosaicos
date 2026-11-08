import JSZip from 'jszip';
import { CharacterSheet, TilesetSheet, PixelGrid, Direction, AnimationType } from '../types';

export interface SlicedFrameInfo {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number; // in ms
}

// Convert a single PixelGrid to an ImageData on an HTML Canvas
export function renderGridToCanvas(grid: PixelGrid, scale: number = 1): HTMLCanvasElement {
  const size = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const color = grid[r][c];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
  }

  return canvas;
}

// Generate unified Character Spritesheet PNG and frame slicing layout
export function generateCharacterSpritesheet(character: CharacterSheet): {
  canvas: HTMLCanvasElement;
  slices: SlicedFrameInfo[];
  columns: number;
  rows: number;
} {
  const gridSize = character.gridSize;
  const animKeys = Object.keys(character.animations) as (keyof CharacterSheet['animations'])[];

  // Order animations systematically:
  // Row 0: walk_down
  // Row 1: walk_left
  // Row 2: walk_right
  // Row 3: walk_up
  // Row 4: idle_down / etc
  const orderedAnims: string[] = [
    'walk_down', 'walk_left', 'walk_right', 'walk_up',
    'idle_down', 'idle_left', 'idle_right', 'idle_up'
  ];

  const activeAnims = orderedAnims.filter(k => character.animations[k as keyof CharacterSheet['animations']]);
  const maxFramesInAnim = Math.max(
    ...activeAnims.map(k => character.animations[k as keyof CharacterSheet['animations']]?.frames.length || 0),
    4
  );

  const columns = maxFramesInAnim;
  const rows = activeAnims.length;

  const canvas = document.createElement('canvas');
  canvas.width = columns * gridSize;
  canvas.height = rows * gridSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, slices: [], columns, rows };

  ctx.imageSmoothingEnabled = false;
  const slices: SlicedFrameInfo[] = [];

  activeAnims.forEach((animName, rowIdx) => {
    const seq = character.animations[animName as keyof CharacterSheet['animations']];
    if (!seq) return;

    seq.frames.forEach((frame, colIdx) => {
      const frameCanvas = renderGridToCanvas(frame, 1);
      const x = colIdx * gridSize;
      const y = rowIdx * gridSize;
      ctx.drawImage(frameCanvas, x, y);

      slices.push({
        name: `${animName}_${colIdx}`,
        x,
        y,
        width: gridSize,
        height: gridSize,
        duration: Math.round(1000 / (seq.fps || 6)),
      });
    });
  });

  return { canvas, slices, columns, rows };
}

// Generate unified Tileset Spritesheet PNG and frame slicing layout
export function generateTilesetSpritesheet(tileset: TilesetSheet): {
  canvas: HTMLCanvasElement;
  slices: SlicedFrameInfo[];
} {
  const gridSize = tileset.gridSize;
  const count = tileset.tiles.length;
  // Make a square-ish texture (e.g. 3 columns x 3 rows for 9 tiles)
  const columns = Math.ceil(Math.sqrt(count)) || 3;
  const rows = Math.ceil(count / columns) || 3;

  const canvas = document.createElement('canvas');
  canvas.width = columns * gridSize;
  canvas.height = rows * gridSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, slices: [] };

  ctx.imageSmoothingEnabled = false;
  const slices: SlicedFrameInfo[] = [];

  tileset.tiles.forEach((tile, index) => {
    const colIdx = index % columns;
    const rowIdx = Math.floor(index / columns);
    const x = colIdx * gridSize;
    const y = rowIdx * gridSize;

    const frameCanvas = renderGridToCanvas(tile.grid, 1);
    ctx.drawImage(frameCanvas, x, y);

    slices.push({
      name: `${tile.id}`,
      x,
      y,
      width: gridSize,
      height: gridSize,
      duration: 0,
    });
  });

  return { canvas, slices };
}

// Generate Godot 4 SpriteFrames .tres resource
export function generateGodotSpriteFrames(
  character: CharacterSheet,
  slices: SlicedFrameInfo[],
  texturePath: string = "res://spritesheet.png"
): string {
  const lines: string[] = [];
  lines.push('[gd_resource type="SpriteFrames" load_steps=100 format=3]');
  lines.push('');
  lines.push(`[ext_resource type="Texture2D" path="${texturePath}" id="1_tex"]`);
  lines.push('');

  // Slices map to SubResource AtlasTexture
  slices.forEach((slice, idx) => {
    lines.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${idx}"]`);
    lines.push('atlas = ExtResource("1_tex")');
    lines.push(`region = Rect2(${slice.x}, ${slice.y}, ${slice.width}, ${slice.height})`);
    lines.push('filter_clip = true');
    lines.push('');
  });

  lines.push('[resource]');
  lines.push('animations = [');

  const animNames = Array.from(new Set(slices.map(s => s.name.replace(/_\d+$/, ''))));

  animNames.forEach((animName, animIdx) => {
    const animSlices = slices.filter(s => s.name.startsWith(`${animName}_`));
    const isComma = animIdx < animNames.length - 1 ? ',' : '';
    lines.push('  {');
    lines.push('    "frames": [');
    animSlices.forEach((_, fIdx) => {
      const globalIdx = slices.findIndex(s => s.name === `${animName}_${fIdx}`);
      const fComma = fIdx < animSlices.length - 1 ? ',' : '';
      lines.push('      {');
      lines.push('        "duration": 1.0,');
      lines.push(`        "texture": SubResource("AtlasTexture_${globalIdx}")`);
      lines.push(`      }${fComma}`);
    });
    lines.push('    ],');
    lines.push('    "loop": true,');
    lines.push(`    "name": &"${animName}",`);
    lines.push('    "speed": 6.0');
    lines.push(`  }${isComma}`);
  });

  lines.push(']');
  return lines.join('\n');
}

// Generate Godot 4 CharacterBody2D Scene file (.tscn)
export function generateGodotScene(characterName: string): string {
  return `[gd_scene load_steps=5 format=3 uid="uid://charactertopdown"]

[ext_resource type="Script" path="res://player_controller.gd" id="1_script"]
[ext_resource type="SpriteFrames" path="res://sprite_frames.tres" id="2_frames"]

[sub_resource type="CapsuleShape2D" id="CapsuleShape2D_1"]
radius = 8.0
height = 14.0

[node name="${characterName}" type="CharacterBody2D"]
script = ExtResource("1_script")

[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]
texture_filter = 1
sprite_frames = ExtResource("2_frames")
animation = &"idle_down"
autoplay = "idle_down"

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
position = Vector2(0, 6)
shape = SubResource("CapsuleShape2D_1")
`;
}

// Generate Godot 4 GDScript Player Controller (.gd)
export function generateGodotGDScript(): string {
  return `extends CharacterBody2D

# PixelForge RPG - 4-Directional Top-Down Controller for Godot 4.x
@export var speed: float = 120.0
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D

var current_direction: String = "down"

func _physics_process(_delta: float) -> void:
\tvar input_vector = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\t
\tif input_vector != Vector2.ZERO:
\t\tvelocity = input_vector.normalized() * speed
\t\t
\t\t# Determine dominant 4-way direction
\t\tif abs(input_vector.x) > abs(input_vector.y):
\t\t\tcurrent_direction = "right" if input_vector.x > 0 else "left"
\t\telse:
\t\t\tcurrent_direction = "down" if input_vector.y > 0 else "up"
\t\t
\t\tsprite.play("walk_" + current_direction)
\telse:
\t\tvelocity = Vector2.ZERO
\t\tsprite.play("idle_" + current_direction)
\t
\tmove_and_slide()
`;
}

// Generate Godot 4 TileSet .tres resource
export function generateGodotTileSet(tileset: TilesetSheet, texturePath: string = "res://tileset.png"): string {
  return `[gd_resource type="TileSet" load_steps=3 format=3]

[ext_resource type="Texture2D" path="${texturePath}" id="1_tex"]

[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]
texture = ExtResource("1_tex")
texture_region_size = Vector2i(${tileset.gridSize}, ${tileset.gridSize})

[resource]
tile_size = Vector2i(${tileset.gridSize}, ${tileset.gridSize})
sources/0 = SubResource("TileSetAtlasSource_1")
`;
}

// Generate Unity SpriteSheet .meta file (YAML)
export function generateUnityMeta(
  guid: string,
  slices: SlicedFrameInfo[],
  pixelsPerUnit: number = 32,
  textureWidth: number = 128,
  textureHeight: number = 128
): string {
  const spriteEntries = slices.map((s, idx) => {
    // Unity rect y coordinate is from bottom-up!
    const unityY = textureHeight - s.y - s.height;
    return `    - serializedVersion: 2
      name: ${s.name}
      rect:
        serializedVersion: 2
        x: ${s.x}
        y: ${unityY}
        width: ${s.width}
        height: ${s.height}
      alignment: 0
      pivot: {x: 0.5, y: 0.5}
      border: {x: 0, y: 0, z: 0, w: 0}
      outline: []
      physicsShape: []
      tessellationDetail: 0
      bones: []
      spriteID: 0000000000000000000000000000000${idx.toString(16).padStart(2, '0')}
      internalID: ${21300000 + idx * 2}
      vertices: []
      indices: 
      edges: []
      weights: []`;
  }).join('\n');

  return `fileFormatVersion: 2
guid: ${guid}
TextureImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 12
  mipmaps:
    mipMapMode: 0
    enableMipMap: 0
    sRGBTexture: 1
    linearTexture: 0
    fadeOut: 0
    borderMipMap: 0
    mipMapsPreserveCoverage: 0
    alphaTestReferenceValue: 0.5
    mipMapFadeDistanceStart: 1
    mipMapFadeDistanceEnd: 3
  bumpmap:
    convertToNormalMap: 0
    externalNormalMap: 0
    heightScale: 0.25
    normalMapFilter: 0
    flipGreenChannel: 0
  isReadable: 0
  streamingMipmaps: 0
  streamingMipmapsPriority: 0
  vTOnly: 0
  ignoreMasterTextureLimit: 0
  grayScaleToAlpha: 0
  generateCubemap: 6
  cubemapConvolution: 0
  seamlessCubemap: 0
  textureFormat: 1
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: 0
    aniso: 1
    mipBias: 0
    wrapU: 1
    wrapV: 1
    wrapW: 1
  nPOTScale: 0
  lightmap: 0
  compressionQuality: 50
  spriteMode: 2
  spriteExtrusion: 1
  spriteMeshType: 0
  alignment: 0
  spritePivot: {x: 0.5, y: 0.5}
  spritePixelsToUnits: ${pixelsPerUnit}
  spriteBorder: {x: 0, y: 0, z: 0, w: 0}
  spriteGenerateFallbackPhysicsShape: 1
  alphaIsTransparency: 1
  spriteSheet:
    serializedVersion: 2
    sprites:
${spriteEntries}
    outline: []
    physicsShape: []
    bones: []
    spriteID: 
    internalID: 0
    vertices: []
    indices: 
    edges: []
    weights: []
  editorMetaData:
    assetStoreHash:
      serializedVersion: 2
      Hash: 00000000000000000000000000000000
    assetBundleName: 
    assetBundleVariant: 
`;
}

// Generate Unity C# TopDownPlayerController.cs
export function generateUnityScript(): string {
  return `using UnityEngine;

/// <summary>
/// PixelForge RPG - Top-Down Character Controller for Unity
/// Attach this component to your Player GameObject with Rigidbody2D and Animator.
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class TopDownPlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 4.5f;

    [Header("Components")]
    [SerializeField] private Animator animator;
    [SerializeField] private Rigidbody2D rb;

    private Vector2 moveInput;
    private Vector2 lastFacingDirection = Vector2.down;

    private static readonly int AnimInputX = Animator.StringToHash("InputX");
    private static readonly int AnimInputY = Animator.StringToHash("InputY");
    private static readonly int AnimIsMoving = Animator.StringToHash("IsMoving");
    private static readonly int AnimLastX = Animator.StringToHash("LastInputX");
    private static readonly int AnimLastY = Animator.StringToHash("LastInputY");

    private void Awake()
    {
        if (rb == null) rb = GetComponent<Rigidbody2D>();
        if (animator == null) animator = GetComponent<Animator>();

        // Ensure 2D Top-down physics defaults
        rb.gravityScale = 0f;
        rb.constraints = RigidbodyConstraints2D.FreezeRotation;
    }

    private void Update()
    {
        // Capture 4-way WASD or Arrow Keys
        float x = Input.GetAxisRaw("Horizontal");
        float y = Input.GetAxisRaw("Vertical");

        moveInput = new Vector2(x, y).normalized;

        if (moveInput.sqrMagnitude > 0.01f)
        {
            lastFacingDirection = moveInput;
        }

        UpdateAnimation();
    }

    private void FixedUpdate()
    {
        rb.linearVelocity = moveInput * moveSpeed;
    }

    private void UpdateAnimation()
    {
        if (animator == null) return;

        bool isMoving = moveInput.sqrMagnitude > 0.01f;
        animator.SetBool(AnimIsMoving, isMoving);

        if (isMoving)
        {
            animator.SetFloat(AnimInputX, moveInput.x);
            animator.SetFloat(AnimInputY, moveInput.y);
            animator.SetFloat(AnimLastX, lastFacingDirection.x);
            animator.SetFloat(AnimLastY, lastFacingDirection.y);
        }
    }
}
`;
}

// Generate Aseprite / TexturePacker JSON Hash Format
export function generateAsepriteJSON(slices: SlicedFrameInfo[], width: number, height: number): string {
  const framesObj: Record<string, any> = {};

  slices.forEach(s => {
    framesObj[`${s.name}.aseprite`] = {
      frame: { x: s.x, y: s.y, w: s.width, h: s.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: s.width, h: s.height },
      sourceSize: { w: s.width, h: s.height },
      duration: s.duration || 166,
    };
  });

  const payload = {
    frames: framesObj,
    meta: {
      app: "PixelForge RPG Studio",
      version: "1.0.0",
      image: "spritesheet.png",
      format: "RGBA8888",
      size: { w: width, h: height },
      scale: "1",
    }
  };

  return JSON.stringify(payload, null, 2);
}

// Helper to bundle and trigger browser download of a complete ZIP
export async function downloadZipBundle(
  engine: 'godot4' | 'unity',
  type: 'character' | 'tileset',
  assetData: CharacterSheet | TilesetSheet
): Promise<void> {
  const zip = new JSZip();

  if (type === 'character') {
    const character = assetData as CharacterSheet;
    const { canvas, slices } = generateCharacterSpritesheet(character);

    // Spritesheet PNG Blob
    const pngBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!pngBlob) throw new Error('Failed to generate PNG blob');

    if (engine === 'godot4') {
      const folder = zip.folder(`godot_${character.name}`) || zip;
      folder.file('spritesheet.png', pngBlob);
      folder.file('sprite_frames.tres', generateGodotSpriteFrames(character, slices, 'res://spritesheet.png'));
      folder.file('character.tscn', generateGodotScene(character.name));
      folder.file('player_controller.gd', generateGodotGDScript());
      folder.file('spritesheet.json', generateAsepriteJSON(slices, canvas.width, canvas.height));
      folder.file('README.md', `# ${character.name} - Godot 4.x Asset Pack
Generado por PixelForge RPG Studio.

## Instrucciones de Instalación en Godot 4:
1. Arrastra la carpeta descomprimida dentro de tu carpeta 'res://' en tu proyecto de Godot 4.
2. Abre la escena 'character.tscn' en el editor.
3. El nodo CharacterBody2D ya tiene configurado:
   - AnimatedSprite2D con 'sprite_frames.tres' (animaciones walk_down, walk_up, walk_left, walk_right, idle_down...)
   - CollisionShape2D con CapsuleShape2D para RPG top-down.
   - Script 'player_controller.gd' listo para moverse con flechas o WASD.
4. Presiona F6 para probar la escena directamente.
`);
    } else {
      // Unity
      const folder = zip.folder(`unity_${character.name}`) || zip;
      folder.file('spritesheet.png', pngBlob);
      const fakeGuid = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      folder.file('spritesheet.png.meta', generateUnityMeta(fakeGuid, slices, character.gridSize, canvas.width, canvas.height));
      folder.file('TopDownPlayerController.cs', generateUnityScript());
      folder.file('spritesheet.json', generateAsepriteJSON(slices, canvas.width, canvas.height));
      folder.file('README.md', `# ${character.name} - Unity 2D Asset Pack
Generado por PixelForge RPG Studio.

## Instrucciones de Instalación en Unity:
1. Copia los archivos dentro de tu carpeta 'Assets/Sprites/${character.name}/'.
2. Gracias al archivo 'spritesheet.png.meta', Unity configurará automáticamente:
   - Sprite Mode: Multiple
   - Filter Mode: Point (No Filter) para píxeles perfectos
   - Pixels Per Unit: ${character.gridSize}
   - Todos los cortes de animación (walk_down_0, walk_down_1...) ya rebanados.
3. Arrastra el script 'TopDownPlayerController.cs' a tu Player GameObject con Rigidbody2D.
`);
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    triggerDownload(zipContent, `${character.name}_${engine}.zip`);
  } else {
    // Tileset
    const tileset = assetData as TilesetSheet;
    const { canvas, slices } = generateTilesetSpritesheet(tileset);
    const pngBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!pngBlob) throw new Error('Failed to generate PNG blob');

    if (engine === 'godot4') {
      const folder = zip.folder(`godot_${tileset.name}`) || zip;
      folder.file('tileset.png', pngBlob);
      folder.file('tileset.tres', generateGodotTileSet(tileset, 'res://tileset.png'));
      folder.file('tileset.json', generateAsepriteJSON(slices, canvas.width, canvas.height));
      folder.file('README.md', `# ${tileset.name} - Godot 4 TileSet
1. Arrastra a tu proyecto Godot.
2. Asigna 'tileset.tres' en tu nodo TileMapLayer.
`);
    } else {
      const folder = zip.folder(`unity_${tileset.name}`) || zip;
      folder.file('tileset.png', pngBlob);
      const fakeGuid = 'b2c3d4e5f6a10718293a4b5c6d7e8f91';
      folder.file('tileset.png.meta', generateUnityMeta(fakeGuid, slices, tileset.gridSize, canvas.width, canvas.height));
      folder.file('tileset.json', generateAsepriteJSON(slices, canvas.width, canvas.height));
      folder.file('README.md', `# ${tileset.name} - Unity 2D Tilemap
1. Copia a tu carpeta de Assets.
2. Abre Window > 2D > Tile Palette y arrastra el spritesheet.
`);
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    triggerDownload(zipContent, `${tileset.name}_${engine}.zip`);
  }
}

// Download raw Blob helper
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
