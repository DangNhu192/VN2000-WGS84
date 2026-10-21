const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('1. Verify pdoom-video skill exists in both global and project skill folders', () => {
  const projectSkill = path.join(__dirname, '..', '.agents', 'skills', 'pdoom-video', 'SKILL.md');
  assert.ok(fs.existsSync(projectSkill), 'Project pdoom-video SKILL.md must exist');
  const projectSkillContent = fs.readFileSync(projectSkill, 'utf8');
  assert.ok(projectSkillContent.includes('pdoom-video'), 'SKILL.md must define pdoom-video');
  assert.ok(projectSkillContent.includes('mexicat/pdoom-video'), 'SKILL.md must cite mexicat/pdoom-video');
  assert.ok(projectSkillContent.includes('Word-synced Karaoke Typography'), 'SKILL.md must cover Word-synced Karaoke');
});

test('2. Verify tutorials-pdoom.html studio player exists with Full HD canvas & dedicated functional walkthrough videos', () => {
  const htmlPath = path.join(__dirname, '..', 'tutorials-pdoom.html');
  assert.ok(fs.existsSync(htmlPath), 'tutorials-pdoom.html must exist');
  const content = fs.readFileSync(htmlPath, 'utf8');

  // Kiểm tra canvas
  assert.ok(content.includes('id="videoCanvas"'), 'Must have #videoCanvas element');
  assert.ok(content.includes('width="1920" height="1080"'), 'Must render at 1920x1080 Full HD');

  // Kiểm tra các tập video riêng biệt cho từng chức năng
  assert.ok(content.includes('id: "ep1"'), 'Must contain Episode 1 config');
  assert.ok(content.includes('id: "ep2"'), 'Must contain Episode 2 config');
  assert.ok(content.includes('id: "ep3"'), 'Must contain Episode 3 config');
  assert.ok(content.includes('id: "ep4"'), 'Must contain Episode 4 config');
  assert.ok(content.includes('id: "ep5"'), 'Must contain Episode 5 config');
  assert.ok(content.includes('id: "ep6"'), 'Must contain Episode 6 config');
  assert.ok(content.includes('id: "ep7"'), 'Must contain Episode 7 config');

  // Kiểm tra ảnh chụp màn hình thực tế và giọng đọc hướng dẫn
  assert.ok(content.includes('assets/tutorial_screens/'), 'Must use real screen capture assets');
  assert.ok(content.includes('SpeechSynthesisUtterance'), 'Must include Web Speech synthesis voice guide');
  assert.ok(content.includes('function exportVideoMp4()'), 'Must include MediaRecorder client-side video export');
});

test('3. Verify all 3 bilingual SRT subtitle files exist with correct timestamps', () => {
  const srtDir = path.join(__dirname, '..', 'assets', 'video_assets');
  const ep1Srt = path.join(srtDir, 'ep1_coor_transform.srt');
  const ep2Srt = path.join(srtDir, 'ep2_project_fieldbook.srt');
  const ep3Srt = path.join(srtDir, 'ep3_minicad_resection.srt');

  assert.ok(fs.existsSync(ep1Srt), 'ep1_coor_transform.srt must exist');
  assert.ok(fs.existsSync(ep2Srt), 'ep2_project_fieldbook.srt must exist');
  assert.ok(fs.existsSync(ep3Srt), 'ep3_minicad_resection.srt must exist');

  const ep1Content = fs.readFileSync(ep1Srt, 'utf8');
  assert.ok(ep1Content.includes('00:00:01,000 --> 00:00:04,500'), 'SRT must have valid timecodes');
  assert.ok(ep1Content.includes('Kỹ sư trắc địa ra khơi'), 'SRT must have Vietnamese text');
  assert.ok(ep1Content.includes('Survey engineers heading'), 'SRT must have English translation');
});

test('4. Verify master storyboard JSON and CapCut typography assets exist', () => {
  const assetDir = path.join(__dirname, '..', 'assets', 'video_assets');
  const sbPath = path.join(assetDir, 'tutorials_storyboard.json');
  assert.ok(fs.existsSync(sbPath), 'tutorials_storyboard.json must exist');

  const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
  assert.equal(sb.videos.length, 3, 'Must define exactly 3 videos');
  assert.equal(sb.language_audio, 'vi-VN (Singing / Rhythmic Guide)');
  assert.equal(sb.language_subtitles, 'Bilingual (VI - EN)');

  // Kiểm tra các file CapCut Typography
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-tech_cyber.json')), 'tech_cyber json must exist');
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-tech_cyber.svg')), 'tech_cyber svg must exist');
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-bold_impact.json')), 'bold_impact json must exist');
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-bold_impact.svg')), 'bold_impact svg must exist');
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-kinetic_hype.json')), 'kinetic_hype json must exist');
  assert.ok(fs.existsSync(path.join(assetDir, 'ags-typography-kinetic_hype.svg')), 'kinetic_hype svg must exist');
});

test('5. Verify index.html Drawer Menu includes link to Video Studio', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('id="drawerItem_pdoom_video"'), 'index.html must have #drawerItem_pdoom_video');
  assert.ok(indexHtml.includes('tutorials-pdoom.html'), 'Drawer item must link to tutorials-pdoom.html');
});
