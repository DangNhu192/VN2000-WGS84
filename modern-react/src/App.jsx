import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Compass, 
  MapPin, 
  Settings, 
  Sun, 
  Moon, 
  Copy, 
  Clipboard, 
  ArrowRightLeft, 
  Layers, 
  Navigation,
  CheckCircle2,
  Database
} from 'lucide-react';
import { 
  VN_PROVINCES, 
  convertWgsToVn2k, 
  convertVn2kToWgs, 
  formatLatLong, 
  parseKttString 
} from './utils/geodesy';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Active module
  const [activeTab, setActiveTab] = useState('convert'); // 'convert' | 'stakeout' | 'points' | 'settings'

  // Geodetic parameters
  const [provinceIndex, setProvinceIndex] = useState(0); // TP. Hồ Chí Minh
  const [muiChieu, setMuiChieu] = useState(3); // 3 độ hoặc 6 độ

  const currentProvince = useMemo(() => VN_PROVINCES[provinceIndex] || VN_PROVINCES[0], [provinceIndex]);
  const currentKtt = useMemo(() => {
    return (currentProvince.deg || 105) + (currentProvince.min || 0) / 60.0;
  }, [currentProvince]);
  const currentScale = useMemo(() => (muiChieu === 6 ? 0.9996 : 0.9999), [muiChieu]);

  // Conversion States
  const [wgsLat, setWgsLat] = useState('10.776889');
  const [wgsLng, setWgsLng] = useState('106.700806');
  const [vn2kX, setVn2kX] = useState('');
  const [vn2kY, setVn2kY] = useState('');

  const [calcResultVn2k, setCalcResultVn2k] = useState(null);
  const [calcResultWgs, setCalcResultWgs] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto calculate WGS -> VN2000
  const handleConvertWgsToVn2k = () => {
    const lat = parseFloat(wgsLat);
    const lng = parseFloat(wgsLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const res = convertWgsToVn2k(lat, lng, currentKtt, currentScale);
      if (res) {
        setCalcResultVn2k({
          x: res.X.toFixed(3),
          y: res.Y.toFixed(3)
        });
      }
    }
  };

  // Auto calculate VN2000 -> WGS
  const handleConvertVn2kToWgs = () => {
    const x = parseFloat(vn2kX);
    const y = parseFloat(vn2kY);
    if (!isNaN(x) && !isNaN(y)) {
      const res = convertVn2kToWgs(x, y, currentKtt, currentScale);
      if (res) {
        setCalcResultWgs({
          lat: res.lat.toFixed(6),
          lng: res.lng.toFixed(6),
          dms: formatLatLong(res.lat, res.lng)
        });
      }
    }
  };

  useEffect(() => {
    handleConvertWgsToVn2k();
  }, [wgsLat, wgsLng, currentKtt, currentScale]);

  // Copy helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      
      {/* 1. TOP PRECISION TOOLBAR */}
      <header style={{
        height: '56px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Compass size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.3px' }}>
              VN2000 PRO <span style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '600' }}>[React Edition]</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {currentProvince.name} • KTT {currentProvince.deg}°{currentProvince.min || '00'}' • Múi {muiChieu}°
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Đổi giao diện Sáng / Tối"
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {theme === 'dark' ? <Sun size={15} color="#facc15" /> : <Moon size={15} color="#0284c7" />}
            <span>{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN LAYOUT (SIDEBAR NAVIGATION + CONTENT AREA) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        {/* Sidebar Nav */}
        <aside style={{
          width: '220px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('convert')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'convert' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'convert' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: activeTab === 'convert' ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <ArrowRightLeft size={16} />
            <span>Chuyển Đổi Tọa Độ</span>
          </button>

          <button
            onClick={() => setActiveTab('stakeout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'stakeout' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'stakeout' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: activeTab === 'stakeout' ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Navigation size={16} />
            <span>Cắm Mốc Thực Địa</span>
          </button>

          <button
            onClick={() => setActiveTab('points')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'points' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'points' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: activeTab === 'points' ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <MapPin size={16} />
            <span>Sổ Đo & Mốc Dự Án</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'settings' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: activeTab === 'settings' ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: 'auto'
            }}
          >
            <Settings size={16} />
            <span>Cài Đặt KTT & Múi</span>
          </button>
        </aside>

        {/* Workspace Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-canvas)' }}>
          
          {/* TAB 1: CHUYỂN ĐỔI TỌA ĐỘ */}
          {activeTab === 'convert' && (
            <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Header Box */}
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  Chuyển Đổi Tọa Độ WGS-84 ⇄ VN-2000
                </h1>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Áp dụng mô hình toán học Bursa-Wolf 7 tham số theo tiêu chuẩn Quyết định số 05/2007/QĐ-BTNMT.
                </p>
              </div>

              {/* Conversion Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Panel 1: WGS-84 sang VN-2000 */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-accent)' }}>
                      1. WGS-84 (GPS Toàn cầu)
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Độ thập phân</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Vĩ độ (Latitude B):
                    </label>
                    <input 
                      type="text" 
                      value={wgsLat} 
                      onChange={(e) => setWgsLat(e.target.value)}
                      className="font-mono-numbers"
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-canvas)',
                        padding: '0 10px',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Kinh độ (Longitude L):
                    </label>
                    <input 
                      type="text" 
                      value={wgsLng} 
                      onChange={(e) => setWgsLng(e.target.value)}
                      className="font-mono-numbers"
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-canvas)',
                        padding: '0 10px',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  {/* Kết quả VN-2000 */}
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-success)' }}>
                        ✓ Kết quả VN-2000:
                      </span>
                      {calcResultVn2k && (
                        <button
                          onClick={() => copyToClipboard(`X=${calcResultVn2k.x}, Y=${calcResultVn2k.y}`)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-accent)',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copied ? <CheckCircle2 size={13} color="#10b981" /> : <Copy size={13} />}
                          <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      )}
                    </div>
                    {calcResultVn2k ? (
                      <div className="font-mono-numbers" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                        <div>• X (Bắc): <b>{calcResultVn2k.x}</b> m</div>
                        <div>• Y (Đông): <b>{calcResultVn2k.y}</b> m</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nhập tọa độ để tính toán...</div>
                    )}
                  </div>
                </div>

                {/* Panel 2: VN-2000 sang WGS-84 */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--accent-warning)' }}>
                      2. VN-2000 (Hệ Quy chiếu Quốc gia)
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mét (m)</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Tọa độ X (Bắc ~ 1.000.000m):
                    </label>
                    <input 
                      type="text" 
                      placeholder="VD: 1192083.456" 
                      value={vn2kX} 
                      onChange={(e) => setVn2kX(e.target.value)}
                      className="font-mono-numbers"
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-canvas)',
                        padding: '0 10px',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Tọa độ Y (Đông ~ 500.000m):
                    </label>
                    <input 
                      type="text" 
                      placeholder="VD: 576420.123" 
                      value={vn2kY} 
                      onChange={(e) => setVn2kY(e.target.value)}
                      className="font-mono-numbers"
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-canvas)',
                        padding: '0 10px',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <button
                    onClick={handleConvertVn2kToWgs}
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    ⚡ Tính chuyển sang WGS-84
                  </button>

                  {/* Kết quả WGS-84 */}
                  {calcResultWgs && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-success)', marginBottom: '4px' }}>
                        ✓ Tọa độ WGS-84:
                      </div>
                      <div className="font-mono-numbers" style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                        <div>• Lat: <b>{calcResultWgs.lat}</b></div>
                        <div>• Lng: <b>{calcResultWgs.lng}</b></div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CẮM MỐC THỰC ĐỊA */}
          {activeTab === 'stakeout' && (
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                Cắm Mốc Thực Địa & Dẫn Hướng Radar
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Hỗ trợ cảm biến la bàn con quay hồi chuyển 360° và đo cự ly thực tế tới mốc.
              </p>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  border: '2px dashed var(--accent-primary)',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(2, 132, 199, 0.05)'
                }}>
                  <Compass size={64} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  Radar Cắm Mốc Đang Sẵn Sàng
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Cho phép định vị GPS trên điện thoại hoặc kết nối đầu máy Rover RTK để bắt đầu dẫn hướng mốc thực địa.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SỔ ĐO & MỐC */}
          {activeTab === 'points' && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                Sổ Đo & Danh Sách Mốc Dự Án
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Quản lý các mốc khống chế, ranh quy hoạch và dữ liệu đo đạc thực tế.
              </p>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 12px' }}>Tên Mốc</th>
                      <th style={{ padding: '10px 12px' }}>Tọa độ X (VN-2000)</th>
                      <th style={{ padding: '10px 12px' }}>Tọa độ Y (VN-2000)</th>
                      <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>DC1</td>
                      <td style={{ padding: '10px 12px' }} className="font-mono-numbers">1,144,058.623</td>
                      <td style={{ padding: '10px 12px' }} className="font-mono-numbers">576,218.450</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Mốc gốc cấp 3</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>DC2</td>
                      <td style={{ padding: '10px 12px' }} className="font-mono-numbers">1,144,120.890</td>
                      <td style={{ padding: '10px 12px' }} className="font-mono-numbers">576,305.112</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Mốc phụ ranh</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CÀI ĐẶT HỆ THỐNG */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                Cài Đặt Kinh Tuyến Trục & Múi Chiếu
              </h1>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Chọn Tỉnh / Thành phố:
                  </label>
                  <select
                    value={provinceIndex}
                    onChange={(e) => setProvinceIndex(parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-canvas)',
                      padding: '0 10px',
                      fontSize: '13px'
                    }}
                  >
                    {VN_PROVINCES.map((p, idx) => (
                      <option key={p.name} value={idx}>
                        {p.name} ({p.deg}°{p.min || '00'}')
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Múi Chiếu Bản Đồ:
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setMuiChieu(3)}
                      style={{
                        flex: 1,
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: muiChieu === 3 ? 'var(--accent-primary)' : 'var(--bg-canvas)',
                        color: muiChieu === 3 ? '#ffffff' : 'inherit',
                        fontWeight: '700',
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      Múi 3° (k₀ = 0.9999 - Bản đồ địa chính)
                    </button>
                    <button
                      onClick={() => setMuiChieu(6)}
                      style={{
                        flex: 1,
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: muiChieu === 6 ? 'var(--accent-primary)' : 'var(--bg-canvas)',
                        color: muiChieu === 6 ? '#ffffff' : 'inherit',
                        fontWeight: '700',
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      Múi 6° (k₀ = 0.9996 - Bản đồ địa hình)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
