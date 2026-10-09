/**
 * VolumeCalculationEngine - Bộ Động Cơ Tính Toán Khối Lượng Đào Đắp & Trắc Dọc
 * Chuẩn TCVN 4447:2012 & Spec-Driven Development (Bộ Nhớ Spec-Kit)
 * Độc lập 100% với DOM
 */

const VolumeCalculationEngine = {
    // Tính chênh cao tại từng cọc: Dương là ĐẮP, Âm là ĐÀO
    calculateStationDeltas(stations) {
        return stations.map(st => {
            const deltaH = (st.designH || 0) - (st.groundH || 0);
            return {
                ...st,
                deltaH: Number(deltaH.toFixed(3)),
                type: deltaH > 0.001 ? 'FILL' : (deltaH < -0.001 ? 'CUT' : 'BALANCED')
            };
        });
    },

    // Tính thể tích đào đắp giữa các cọc liên tiếp theo phương pháp trung bình diện tích
    calculateSegmentVolumes(stations) {
        if (!stations || stations.length < 2) return [];
        const segments = [];

        for (let i = 0; i < stations.length - 1; i++) {
            const st1 = stations[i];
            const st2 = stations[i + 1];
            const dist = Math.abs((st2.distance || 0) - (st1.distance || 0));

            const cut1 = Math.max(0, (st1.groundH || 0) - (st1.designH || 0));
            const cut2 = Math.max(0, (st2.groundH || 0) - (st2.designH || 0));
            const fill1 = Math.max(0, (st1.designH || 0) - (st1.groundH || 0));
            const fill2 = Math.max(0, (st2.designH || 0) - (st2.groundH || 0));

            // Thể tích tạm tính với bề rộng đáy mặt đường/hào mương B (mặc định 4.0m)
            const b = 4.0;
            const cutVol = ((cut1 * b + cut2 * b) / 2.0) * dist;
            const fillVol = ((fill1 * b + fill2 * b) / 2.0) * dist;

            segments.push({
                fromStation: st1.name,
                toStation: st2.name,
                distance: Number(dist.toFixed(2)),
                cutVolume: Number(cutVol.toFixed(2)),
                fillVolume: Number(fillVol.toFixed(2))
            });
        }
        return segments;
    },

    // Tính thể tích hố móng hình chóp cụt theo TCVN 4447:2012
    // V = (H / 6) * [A * B + (A + a) * (B + b) + a * b]
    calculatePitVolumeTCVN4447({ bottomLength, bottomWidth, depth, slopeM }) {
        const a = bottomLength;
        const b = bottomWidth;
        const H = depth;
        const m = slopeM; // Hệ số mái dốc 1:m (VD: cát m=1.0, đất sét m=0.5)

        const topLength = a + 2 * m * H;
        const topWidth = b + 2 * m * H;

        // Công thức Simpson cho hình chóp cụt hố đào
        const V = (H / 6.0) * (a * b + (a + topLength) * (b + topWidth) + topLength * topWidth);
        const topArea = topLength * topWidth;
        const bottomArea = a * b;

        return {
            volume: Number(V.toFixed(2)),
            topLength: Number(topLength.toFixed(2)),
            topWidth: Number(topWidth.toFixed(2)),
            topArea: Number(topArea.toFixed(2)),
            bottomArea: Number(bottomArea.toFixed(2))
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VolumeCalculationEngine;
} else if (typeof window !== 'undefined') {
    window.VolumeCalculationEngine = VolumeCalculationEngine;
}
