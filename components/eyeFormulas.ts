/**
 * Este archivo contiene las "fórmulas" para dibujar diferentes estilos de ojos como trazados SVG.
 * Separar esta lógica compleja ayuda a mantenerla y asegura que las correcciones importantes no se pierdan.
 */
import type { CharacterParams } from '../types';

interface EyeFormulaParams {
  style: CharacterParams['eyeStyle'];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  upperLidCoverage: number; // 0-100
  lowerLidCoverage: number; // 0-100
}

/**
 * Genera el string del atributo `d` para un trazado SVG <path> que representa un ojo.
 * 
 * @param params Parámetros de configuración del ojo.
 * @returns El string `d` para el path SVG.
 */
export function getEyePathData(params: EyeFormulaParams): string {
  const { style, cx, cy, rx, ry, upperLidCoverage, lowerLidCoverage } = params;

  switch (style) {
    case 'realistic': {
        const leftPointX = cx - rx;
        const rightPointX = cx + rx;
        const verticalCenterY = cy;
        
        // Los párpados se curvan usando un punto de control cuadrático de Bézier.
        const upperControlY = (cy - ry) + (2 * ry * upperLidCoverage) / 100;
        const lowerControlY = (cy + ry) - (2 * ry * lowerLidCoverage) / 100;

        if (upperControlY >= lowerControlY) {
            const midY = (upperControlY + lowerControlY) / 2;
            return `M ${leftPointX},${midY} L ${rightPointX},${midY} Z`; // Ojo cerrado
        }

        return `M ${leftPointX},${verticalCenterY} Q ${cx},${upperControlY} ${rightPointX},${verticalCenterY} Q ${cx},${lowerControlY} ${leftPointX},${verticalCenterY} Z`;
    }

    case 'blocky':
    case 'circle': {
        const eyeTopY = cy - ry;
        const eyeBottomY = cy + ry;

        // Calcula los puntos X en la elipse para una Y dada.
        const getXforY = (y: number) => {
            const y_clamped = Math.max(eyeTopY, Math.min(eyeBottomY, y));
            const y_term_sq = ((y_clamped - cy) / ry) ** 2;
            // Evita valores negativos por imprecisiones de punto flotante.
            const x_offset = rx * Math.sqrt(Math.max(0, 1 - y_term_sq));
            return { x1: cx - x_offset, x2: cx + x_offset };
        };
        
        const upperLidY = eyeTopY + (2 * ry * upperLidCoverage) / 100;
        const lowerLidY = eyeBottomY - (2 * ry * lowerLidCoverage) / 100;

        if (upperLidY >= lowerLidY) {
            const midY = (upperLidY + lowerLidY) / 2;
            const { x1, x2 } = getXforY(midY);
            return `M ${x1},${midY} L ${x2},${midY} Z`; // Ojo cerrado
        }

        const hasUpperLid = upperLidCoverage > 0.1;
        const hasLowerLid = lowerLidCoverage > 0.1;
        const upperPoints = getXforY(upperLidY);
        const lowerPoints = getXforY(lowerLidY);
        
        // ### DOCUMENTACIÓN DE LA FÓRMULA DEL ARCO SVG ###
        // El comando de arco (A) en SVG es: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
        // - large-arc-flag: 0 para el arco más corto, 1 para el más largo. Siempre usaremos 0.
        // - sweep-flag: 1 para la dirección "positiva" (sentido horario), 0 para la "negativa" (sentido antihorario).
        
        let path = `M ${upperPoints.x1} ${upperLidY}`; // 1. Empezar en el punto superior-izquierdo.
        
        // 2. Borde superior: o una línea recta (párpado) o un arco.
        if (hasUpperLid) {
            path += ` L ${upperPoints.x2} ${upperLidY}`;
        } else {
            // Arco de arriba-izquierda a arriba-derecha. Barrido en sentido horario (1).
            path += ` A ${rx} ${ry} 0 0 1 ${upperPoints.x2} ${upperLidY}`;
        }

        // 3. Borde derecho: siempre un arco de arriba-derecha a abajo-derecha. Barrido en sentido horario (1).
        path += ` A ${rx} ${ry} 0 0 1 ${lowerPoints.x2} ${lowerLidY}`;
        
        // 4. Borde inferior: o una línea recta (párpado) o un arco.
        if (hasLowerLid) {
            path += ` L ${lowerPoints.x1} ${lowerLidY}`;
        } else {
            // *** ¡LA CORRECCIÓN CLAVE ESTÁ AQUÍ! ***
            // Arco de abajo-derecha a abajo-izquierda. Para seguir el contorno inferior,
            // el barrido debe ser en sentido antihorario (0). Un valor de (1) haría que
            // el arco diera la vuelta por arriba, deformando el ojo.
            path += ` A ${rx} ${ry} 0 0 0 ${lowerPoints.x1} ${lowerLidY}`; // sweep-flag es 0
        }

        // 5. Borde izquierdo: siempre un arco de abajo-izquierda a arriba-izquierda para cerrar. Barrido en sentido horario (1).
        path += ` A ${rx} ${ry} 0 0 1 ${upperPoints.x1} ${upperLidY}`;
        
        path += ' Z';
        return path;
    }
    
    default:
        return '';
  }
}
