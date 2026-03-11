<script lang="ts">
  import {
    Infographic, ListRowHorizontal, ListRowVertical, ListGrid, ListPyramid,
    SequenceTimeline, SequenceSnake, SequenceRoadmap, SequenceStairs, SequenceAscending,
    HierarchyTree, CompareSwot, CompareQuadrant, CompareBinary,
    ListSector, CycleRadial, FlowLinear, MindMap, RelationNetwork, RelationVenn, RelationCircle,
    IconArrowNode, BadgeCard
  } from '@plugins/data-display/infographic'
  import {
    kpiItems, rankingItems, teamItems, processItems, timelineItems,
    orgChart, swotData, marketShare, devProcess, pdcaCycle, eisenhowerMatrix,
    approvalFlow, mindMapData, networkNodes, networkEdges, compareLeft, compareRight,
    roadmapMilestones, stairsSteps, ascendingSteps, vennSets, vennOverlaps,
    circleNodes, circleConnections
  } from './infographic-demo-data'

  interface Props {
    selectedTheme: string
    selectedPalette: string
    showArrows: boolean
  }
  let { selectedTheme, selectedPalette, showArrows }: Props = $props()
</script>

<h2 class="section-title">Structure Components (21)</h2>

<section class="demo-section">
  <h3>1. ListRowHorizontal</h3>
  <p class="component-desc">Horizontal row layout with optional arrows between items</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
      <ListRowHorizontal items={kpiItems} width={668} height={108} {showArrows} palette={selectedPalette}>
        {#snippet item({ data, themeColors, width, height, gradientId })}
          <IconArrowNode label={data.label} desc={data.value} icon={data.icon} {themeColors} {width} {height} {gradientId} />
        {/snippet}
      </ListRowHorizontal>
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>2. ListGrid</h3>
  <p class="component-desc">Grid layout with configurable columns (2xN default)</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={300} padding={16}>
      <ListGrid items={teamItems} width={468} height={268} columns={2} gap={12} palette={selectedPalette}>
        {#snippet item({ data, themeColors, width, height, gradientId })}
          <BadgeCard label={data.label} value={String(data.value ?? '')} desc={data.desc} icon={data.icon} {themeColors} {width} {height} {gradientId} />
        {/snippet}
      </ListGrid>
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>3. ListPyramid</h3>
  <p class="component-desc">True pyramid shape with trapezoid layers for hierarchy and ranking</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
      <ListPyramid items={rankingItems} width={468} height={288} direction="up" palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>4. ListZigzag</h3>
  <p class="component-desc">Zigzag/alternating layout for process flows</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={800} height={180} padding={16}>
      <ListRowHorizontal items={processItems} width={768} height={148} {showArrows} palette={selectedPalette}>
        {#snippet item({ data, themeColors, width, height, gradientId })}
          <IconArrowNode label={data.label} desc={data.desc} icon={data.icon} {themeColors} {width} {height} {gradientId} />
        {/snippet}
      </ListRowHorizontal>
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>5. SequenceTimeline</h3>
  <p class="component-desc">Horizontal timeline with date markers and status</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={850} height={200} padding={16}>
      <SequenceTimeline items={timelineItems} width={818} height={168} palette={selectedPalette} timelinePosition="middle" />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>6. HierarchyTree</h3>
  <p class="component-desc">Tree/organization chart with vertical or horizontal orientation</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={380} padding={16}>
      <HierarchyTree root={orgChart} width={668} height={348} orientation="vertical" nodeWidth={100} nodeHeight={50} levelGap={50} siblingGap={15} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>7. CompareSwot</h3>
  <p class="component-desc">SWOT analysis diagram with 4 quadrants</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={400} padding={16}>
      <CompareSwot data={swotData} width={668} height={368} showHeaders={true} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>8. ListSector</h3>
  <p class="component-desc">Radial sector (pie/donut) layout with proportional or equal sizing</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={400} height={400} padding={16}>
      <ListSector items={marketShare} width={368} height={368} innerRadius={0.4} showLabels={true} labelPosition="outside" palette={selectedPalette} showCenter={true} centerLabel="Market" centerValue="100%" />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>9. SequenceSnake</h3>
  <p class="component-desc">Snake/serpentine layout with alternating flow direction</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={600} height={280} padding={16}>
      <SequenceSnake items={devProcess} width={568} height={248} itemsPerRow={3} showConnections={true} showNumbers={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>10. CycleRadial</h3>
  <p class="component-desc">Circular cycle diagram for PDCA, life cycles, and process loops</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={350} height={350} padding={16}>
      <CycleRadial items={pdcaCycle} width={318} height={318} showArrows={true} showCenter={true} centerLabel="PDCA" centerDesc="Cycle" nodeSize={70} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>11. CompareQuadrant</h3>
  <p class="component-desc">2x2 matrix for Eisenhower, BCG, or risk matrices</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
      <CompareQuadrant
        data={eisenhowerMatrix} width={468} height={368} showAxes={true} showQuadrantColors={true}
        axisLabels={{ xLeft: 'Not Urgent', xRight: 'Urgent', yTop: 'Important', yBottom: 'Not Important' }}
        quadrantLabels={{ topLeft: 'Do First', topRight: 'Schedule', bottomLeft: 'Delegate', bottomRight: 'Eliminate' }}
      />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>12. FlowLinear</h3>
  <p class="component-desc">Linear process flow with numbered steps and arrows</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={800} height={120} padding={16}>
      <FlowLinear steps={approvalFlow} width={768} height={88} direction="horizontal" showNumbers={true} showArrows={true} arrowStyle="chevron" palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>13. ListRowVertical</h3>
  <p class="component-desc">Vertical stack layout with optional arrows</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={200} height={350} padding={16}>
      <ListRowVertical
        items={[
          { label: 'Step 1', value: 'Initialize' },
          { label: 'Step 2', value: 'Process' },
          { label: 'Step 3', value: 'Validate' },
          { label: 'Step 4', value: 'Complete' }
        ]}
        width={168} height={318} showArrows={true} arrowDirection="down" palette={selectedPalette}
      />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>14. MindMap</h3>
  <p class="component-desc">Radial mind map for brainstorming and idea organization</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={600} height={450} padding={16}>
      <MindMap root={mindMapData} width={568} height={418} direction="radial" nodeSize={60} levelGap={100} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>15. RelationNetwork</h3>
  <p class="component-desc">Network graph showing node relationships and connections</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
      <RelationNetwork nodes={networkNodes} edges={networkEdges} width={468} height={368} layout="circular" nodeSize={50} showEdgeLabels={false} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>16. CompareBinary</h3>
  <p class="component-desc">Left vs Right binary comparison with item lists</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={320} padding={16}>
      <CompareBinary left={compareLeft} right={compareRight} width={668} height={288} showVsDivider={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>17. SequenceRoadmap</h3>
  <p class="component-desc">Horizontal roadmap with milestone markers for project planning</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={800} height={180} padding={16}>
      <SequenceRoadmap milestones={roadmapMilestones} width={768} height={148} showLine={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>18. SequenceStairs</h3>
  <p class="component-desc">Ascending stair steps showing progression or growth stages</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={300} padding={16}>
      <SequenceStairs steps={stairsSteps} width={668} height={268} direction="up" showNumbers={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>19. SequenceAscending</h3>
  <p class="component-desc">Ascending bars with arrows showing growth or escalation</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={280} padding={16}>
      <SequenceAscending steps={ascendingSteps} width={668} height={248} showArrows={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>20. RelationVenn</h3>
  <p class="component-desc">Venn diagram showing set relationships and overlaps</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
      <RelationVenn sets={vennSets} overlaps={vennOverlaps} width={468} height={368} opacity={0.5} showLabels={true} showItems={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>21. RelationCircle</h3>
  <p class="component-desc">Nodes arranged in circle with connections</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={500} height={450} padding={16}>
      <RelationCircle nodes={circleNodes} connections={circleConnections} width={468} height={418} nodeSize={45} showCenter={true} centerLabel="Team" palette={selectedPalette} />
    </Infographic>
  </div>
</section>
